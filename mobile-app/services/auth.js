/**
 * Authentication Service
 * Ported from frontend/src/services/auth.js
 * Uses expo-secure-store for tokens, AsyncStorage for user data
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { isTokenExpired } from '../utils/tokenUtils';

// Use your PC's local IP when testing on a real device (e.g. iPhone). Run: npm run env:local
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5038';

if (__DEV__ && API_URL.includes('localhost')) {
  console.warn(
    '[Auth] EXPO_PUBLIC_API_URL is localhost. On a real device (iPhone/Android) the app cannot reach your PC. Run: npm run env:local'
  );
}

const KEYS = {
  TOKEN: 'paire_token',
  REFRESH_TOKEN: 'paire_refresh_token',
  USER: 'paire_user',
};

// In-memory cache for fast access
let cachedToken = null;
let cachedRefreshToken = null;
let cachedUser = null;

// Session expiration callback (set by root layout)
let onSessionExpired = null;
// Session start/end callbacks (e.g. for biometric lock: lock on login, unlock on logout)
let onSessionStart = null;
let onSessionEnd = null;

export const setSessionExpiredCallback = (callback) => {
  onSessionExpired = callback;
};

export const setSessionStartCallback = (callback) => {
  onSessionStart = callback;
};

export const setSessionEndCallback = (callback) => {
  onSessionEnd = callback;
};

/**
 * Get stored auth token
 */
export const getToken = () => cachedToken;

/**
 * Get stored refresh token
 */
export const getRefreshToken = () => cachedRefreshToken;

/**
 * Get stored user data
 */
export const getStoredUser = () => cachedUser;

/**
 * Update stored user data (optimistic update)
 */
export const updateStoredUser = async (updates) => {
  if (!cachedUser) return;
  cachedUser = { ...cachedUser, ...updates };
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(cachedUser));
};

/**
 * Store authentication data (internal).
 * When persist is false, only keeps data in memory.
 * When notifySessionStart is true, fires onSessionStart so biometric lock can show (e.g. after background).
 */
const storeAuthData = async (token, refreshToken, user, persist = true, notifySessionStart = true) => {
  const hadSession = !!cachedToken;
  cachedToken = token;
  cachedRefreshToken = refreshToken;
  cachedUser = user;

  if (token && !hadSession && notifySessionStart) {
    setTimeout(() => onSessionStart?.(), 0);
  }

  if (!persist) {
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(KEYS.TOKEN, token),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken || ''),
    AsyncStorage.setItem(KEYS.USER, JSON.stringify(user)),
  ]);
};

/**
 * Clear authentication data
 */
const clearAuthData = async () => {
  cachedToken = null;
  cachedRefreshToken = null;
  cachedUser = null;

  onSessionEnd?.();

  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(KEYS.USER),
  ]);
};

/**
 * Handle session expiration
 */
const handleSessionExpiration = async () => {
  await clearAuthData();
  onSessionExpired?.();
};

/**
 * Load cached auth data from storage on app start
 */
export const loadAuthData = async () => {
  try {
    const [token, refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync(KEYS.TOKEN),
      SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
      AsyncStorage.getItem(KEYS.USER),
    ]);

    cachedToken = token;
    cachedRefreshToken = refreshToken || null;
    cachedUser = userJson ? JSON.parse(userJson) : null;

    // Check if token is expired
    if (cachedToken && isTokenExpired(cachedToken)) {
      console.warn('Stored token expired, clearing session');
      await clearAuthData();
      return null;
    }

    if (cachedToken && cachedUser) {
      return { token: cachedToken, user: cachedUser };
    }
    return null;
  } catch (error) {
    console.error('Error loading auth data:', error);
    return null;
  }
};

/**
 * Make authenticated API request (used only within auth service)
 */
const authApiRequest = async (url, options = {}) => {
  const token = getToken();

  if (token && isTokenExpired(token)) {
    await handleSessionExpiration();
    throw new Error('Session expired. Please log in again.') // i18n-ignore: dev, message translated in UI;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios({
    url: `${API_URL}${url}`,
    ...options,
    headers,
  });

  return response.data;
};

/**
 * Unauthenticated request (no Authorization header). Use for login/register so a stale token is never sent.
 */
const anonRequest = async (url, options = {}) => {
  const response = await axios({
    url: `${API_URL}${url}`,
    method: options.method || 'GET',
    data: options.data,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Authentication service
 */
export const authService = {
  /**
   * Validate credentials with API only (no store). Use when biometric is on: validate -> Face ID -> completeLogin.
   */
  async validateLogin(email, password, rememberMe = false) {
    const data = await anonRequest('/api/auth/login', {
      method: 'POST',
      data: { email, password, rememberMe },
    });
    if (data.requiresTwoFactor) {
      return { ...data, rememberMe };
    }
    return { ...data, rememberMe };
  },

  /**
   * Store auth data after successful Face ID (no lock screen). Call after validateLogin + authenticate().
   */
  async completeLogin(token, refreshToken, user, rememberMe = true) {
    await storeAuthData(token, refreshToken, user, rememberMe, false);
  },

  /**
   * Complete login after 2FA verify. Call after twoFactorService.verify().
   * Accepts verify API response (token or accessToken, refreshToken, user).
   */
  async completeLoginAfter2FA(verifyResponse, rememberMe = true) {
    const token = verifyResponse.token ?? verifyResponse.accessToken;
    const refreshToken = verifyResponse.refreshToken ?? null;
    let user = verifyResponse.user;
    if (!user && token) {
      try {
        const { data } = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        user = data;
      } catch {
        user = { email: verifyResponse.email, id: verifyResponse.sub };
      }
    }
    if (!token || !user) throw new Error('Invalid 2FA verify response') // i18n-ignore: dev;
    // Don't notify session start – user already passed Face ID before 2FA step (or has no biometric), so skip the lock prompt
    await storeAuthData(token, refreshToken, user, rememberMe, false);
  },

  async signIn(email, password, rememberMe = false) {
    try {
      const data = await this.validateLogin(email, password, rememberMe);

      if (data.requiresTwoFactor) {
        return { ...data, rememberMe };
      }

      await storeAuthData(data.token, data.refreshToken, data.user, rememberMe, true);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async signUp(email, password, displayName = '', emailNotificationsEnabled = false, confirmPassword = undefined) {
    return this.register({
      email,
      password,
      confirmPassword: confirmPassword ?? password,
      displayName: displayName ?? '',
      emailNotificationsEnabled,
    });
  },

  async register(userData) {
    try {
      // Use unauthenticated request so no stale token is sent; backend expects email, password, confirmPassword
      const data = await anonRequest('/api/auth/register', {
        method: 'POST',
        data: {
          email: userData.email,
          password: userData.password,
          confirmPassword: userData.confirmPassword ?? userData.password,
          displayName: userData.displayName ?? '',
          emailNotificationsEnabled: userData.emailNotificationsEnabled ?? true,
        },
      });
      return data;
    } catch (error) {
      console.error('Registration error:', error?.response?.data ?? error);
      // Surface API error message so user sees validation or "email already registered" etc.
      const body = error?.response?.data;
      const message = typeof body === 'string'
        ? body
        : (body?.message || (Array.isArray(body?.errors) ? body.errors[0] : body?.error));
      if (message) throw new Error(message);
      throw error;
    }
  },

  async signOut() {
    try {
      const token = getToken();
      if (token) {
        try {
          await authApiRequest('/api/auth/logout', { method: 'POST' });
        } catch (error) {
          console.warn('Backend logout failed:', error);
        }
      }
    } finally {
      await clearAuthData();
    }
  },

  async getSession() {
    if (!cachedToken || !cachedUser) {
      const result = await loadAuthData();
      return result;
    }

    if (isTokenExpired(cachedToken)) {
      await handleSessionExpiration();
      return null;
    }

    return { token: cachedToken, user: cachedUser };
  },

  async getUser(forceRefresh = false) {
    try {
      if (!forceRefresh && cachedUser) return cachedUser;

      const data = await authApiRequest('/api/auth/me');
      if (cachedToken && cachedRefreshToken) {
        await storeAuthData(cachedToken, cachedRefreshToken, data);
      }
      return data;
    } catch (error) {
      console.error('Get user error:', error);
      if (error.response?.status === 401) {
        await clearAuthData();
      }
      throw error;
    }
  },

  async resetPassword(email) {
    return authApiRequest('/api/auth/forgot-password', {
      method: 'POST',
      data: { email },
    });
  },

  async confirmResetPassword(token, email, newPassword) {
    return authApiRequest('/api/auth/reset-password', {
      method: 'POST',
      data: { token, email, newPassword, confirmPassword: newPassword },
    });
  },

  async updatePassword(currentPassword, newPassword) {
    return authApiRequest('/api/auth/change-password', {
      method: 'POST',
      data: { currentPassword, newPassword, confirmPassword: newPassword },
    });
  },

  async confirmEmail(userId, token) {
    return authApiRequest('/api/auth/confirm-email', {
      method: 'POST',
      data: { userId, token },
    });
  },

  async resendConfirmation(email) {
    return authApiRequest('/api/auth/resend-confirmation', {
      method: 'POST',
      data: { email },
    });
  },

  isAuthenticated() {
    return !!cachedToken && !isTokenExpired(cachedToken);
  },

  getCurrentUser() {
    return cachedUser;
  },

  getToken() {
    return cachedToken;
  },
};
