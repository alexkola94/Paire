import { apiRequest } from '../../../shared/services/apiClient'

export const streakService = {
  async getAll() {
    return await apiRequest('/api/streaks')
  },
  async recordActivity(streakType) {
    return await apiRequest('/api/streaks/record', {
      method: 'POST',
      body: JSON.stringify({ streakType })
    })
  }
}
