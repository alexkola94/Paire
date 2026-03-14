/**
 * Financial Health (Paire Score) Service
 */

import { request } from '../../../shared/services/apiClient';

export const financialHealthService = {
  async getScore() { return request('get', '/api/financial-health'); },
  async getHistory(months = 6) { return request('get', `/api/financial-health/history?months=${months}`); },
  async recalculate() { return request('post', '/api/financial-health/recalculate'); },
};
