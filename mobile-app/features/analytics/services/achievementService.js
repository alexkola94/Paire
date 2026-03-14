/**
 * Achievement Service
 */

import { request } from '../../../shared/services/apiClient';

export const achievementService = {
  async getAll() { return request('get', '/api/achievements'); },
  async getUnlocked() { return request('get', '/api/achievements/unlocked'); },
  async getUnnotified() { return request('get', '/api/achievements/unnotified'); },
  async markAsNotified(ids) { return request('post', '/api/achievements/mark-notified', ids); },
  async check() { return request('post', '/api/achievements/check'); },
  async getStats() { return request('get', '/api/achievements/stats'); },
};
