/**
 * Streak Service
 */

import { request } from '../../../shared/services/apiClient';

export const streakService = {
  async getAll() { return request('get', '/api/streaks'); },
  async recordActivity(streakType) { return request('post', '/api/streaks/record', { streakType }); },
};
