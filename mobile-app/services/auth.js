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

export const setSessionExpiredCallback = (callback) => {
  onSessionExpired = callback;
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
 * Store authentication data.
 * When persist is false, only keeps data in memory (session-only); user is logged out when app is killed.
 */
const storeAuthData = async (token, refreshToken, user, persist = true) => {
  cachedToken = token;
  cachedRefreshToken = refreshToken;
  cachedUser = user;

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
    throw new Error('Session expired. Please log in again.');
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
  async signIn(email, password, rememberMe = false) {
    try {
      // Use anonRequest so we never send a stale Bearer token on login
      const data = await anonRequest('/api/auth/login', {
        method: 'POST',
        data: { email, password, rememberMe },
      });

      if (data.requiresTwoFactor) {
        return { ...data, rememberMe };
      }

      await storeAuthData(data.token, data.refreshToken, data.user, rememberMe);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async signUp(email, password, displayName = '', emailNotificationsEnabled = false) {
    return this.register({ email, password, confirmPassword: password, displayName, emailNotificationsEnabled });
  },

  async register(userData) {
    try {
      const data = await authApiRequest('/api/auth/register', {
        method: 'POST',
        data: userData,
      });
      return data;
    } catch (error) {
      console.error('Registration error:', error);
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
