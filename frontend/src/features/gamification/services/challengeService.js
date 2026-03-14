import { apiRequest } from '../../../shared/services/apiClient'

export const challengeService = {
  async getAvailable() {
    return await apiRequest('/api/challenges/available')
  },
  async getUserChallenges(status) {
    const params = status ? `?status=${encodeURIComponent(status)}` : ''
    return await apiRequest(`/api/challenges${params}`)
  },
  async join(challengeId) {
    return await apiRequest(`/api/challenges/${challengeId}/join`, { method: 'POST' })
  },
  async updateProgress(userChallengeId, incrementBy = 1) {
    return await apiRequest(`/api/challenges/${userChallengeId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ incrementBy })
    })
  },
  async claimReward(userChallengeId) {
    return await apiRequest(`/api/challenges/${userChallengeId}/claim`, { method: 'POST' })
  },
  async seed() {
    return await apiRequest('/api/challenges/seed', { method: 'POST' })
  }
}
