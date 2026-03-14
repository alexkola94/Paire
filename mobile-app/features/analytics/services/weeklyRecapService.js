/**
 * Weekly Recap Service
 */

import { request } from '../../../shared/services/apiClient';

export const weeklyRecapService = {
  async getLatest() { return request('get', '/api/weekly-recap'); },
  async getHistory(count = 4) { return request('get', `/api/weekly-recap/history?count=${count}`); },
  async generate() { return request('post', '/api/weekly-recap/generate'); },
};
