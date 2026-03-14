import { apiRequest, getCurrentUser } from '../../../shared/services/apiClient'

export const reminderService = {
  async getSettings() {
    getCurrentUser()
    return await apiRequest('/api/reminders/settings')
  },
  async updateSettings(settings) {
    return await apiRequest('/api/reminders/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  },
  async sendTestEmail(email) {
    return await apiRequest(`/api/reminders/test-email?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })
  },
  async checkReminders() {
    return await apiRequest('/api/reminders/check', { method: 'POST' })
  }
}
