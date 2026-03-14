import { apiRequest } from '../../../shared/services/apiClient'

export const weeklyRecapService = {
  async getLatest() {
    return await apiRequest('/api/weekly-recap')
  },
  async getHistory(count = 4) {
    return await apiRequest(`/api/weekly-recap/history?count=${count}`)
  },
  async generate() {
    return await apiRequest('/api/weekly-recap/generate', { method: 'POST' })
  }
}
