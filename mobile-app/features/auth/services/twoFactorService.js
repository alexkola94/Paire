/**
 * Two-Factor Auth Service
 */

import { request } from '../../../shared/services/apiClient';

export const twoFactorService = {
  async setup() { return request('post', '/api/auth/2fa/setup'); },
  async enable(code) { return request('post', '/api/auth/2fa/enable', { code }); },
  async verify(email, code, tempToken) { return request('post', '/api/auth/2fa/verify', { email, code, tempToken }); },
  async disable(password) { return request('post', '/api/auth/2fa/disable', { password }); },
};
