/**
 * Reminder Service
 */

import { request } from '../../../shared/services/apiClient';

export const reminderService = {
  async getSettings() { return request('get', '/api/reminders/settings'); },
  async updateSettings(settings) { return request('put', '/api/reminders/settings', settings); },
  async sendTestEmail(email) { return request('post', `/api/reminders/test-email?email=${encodeURIComponent(email)}`); },
  async checkReminders() { return request('post', '/api/reminders/check'); },
};
