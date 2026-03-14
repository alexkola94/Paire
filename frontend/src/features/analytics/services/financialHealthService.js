import { apiRequest } from '../../../shared/services/apiClient'

export const financialHealthService = {
  async getScore() {
    return await apiRequest('/api/financial-health')
  },
  async getHistory(months = 6) {
    return await apiRequest(`/api/financial-health/history?months=${months}`)
  },
  async getPartnershipScore() {
    return await apiRequest('/api/financial-health/partnership')
  },
  async recalculate() {
    return await apiRequest('/api/financial-health/recalculate', { method: 'POST' })
  }
}
