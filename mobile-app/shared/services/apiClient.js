/**
 * Shared API Client
 * Axios instance with JWT auth and CSRF protection.
 * Used by feature-specific services.
 */

import axios from 'axios';
import { getToken, getStoredUser } from '../../services/auth';
import { isTokenExpired } from '../../utils/tokenUtils';
import { getCsrfToken, clearCsrfCache } from './csrf';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

let onSessionExpired = null;
export const setApiSessionExpiredCallback = (callback) => {
  onSessionExpired = callback;
};

const handleSessionExpiration = () => {
  onSessionExpired?.();
};

export const getCurrentUser = () => {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) throw new Error('User not authenticated');
  return user;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = getToken();

  if (token && isTokenExpired(token)) {
    handleSessionExpiration();
    return Promise.reject(new Error('Session expired. Please log in again.'));
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) config.headers['X-CSRF-TOKEN'] = csrfToken;
    } catch (e) {
      console.warn('Could not get CSRF token:', e.message);
    }
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      handleSessionExpiration();
    }
    if (error.response?.status === 400) {
      const body = error.response.data;
      if (typeof body === 'string' && body.toLowerCase().includes('csrf')) {
        clearCsrfCache();
      }
    }
    return Promise.reject(error);
  }
);

export const request = async (method, url, data, config = {}) => {
  const response = await api({ method, url, data, ...config });
  return response.data;
};

export default api;
