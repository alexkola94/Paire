import { apiRequest, getCurrentUser } from '../../../shared/services/apiClient'

export const achievementService = {
  async getAll() {
    getCurrentUser()
    return await apiRequest('/api/achievements')
  },
  async getUnlocked() {
    return await apiRequest('/api/achievements/unlocked')
  },
  async getUnnotified() {
    return await apiRequest('/api/achievements/unnotified')
  },
  async markAsNotified(userAchievementIds) {
    return await apiRequest('/api/achievements/mark-notified', {
      method: 'POST',
      body: JSON.stringify(userAchievementIds)
    })
  },
  async check() {
    return await apiRequest('/api/achievements/check', { method: 'POST' })
  },
  async getStats() {
    return await apiRequest('/api/achievements/stats')
  }
}
