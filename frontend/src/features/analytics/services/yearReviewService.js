import { apiRequest } from '../../../shared/services/apiClient'

export const yearReviewService = {
  async getReview(year) {
    try {
      return await apiRequest(`/api/year-review/${year}`)
    } catch (e) {
      if (e.message?.includes('404')) return null
      throw e
    }
  }
}
