import { apiRequest } from '../../../shared/services/apiClient'

export const analyticsService = {
  async getFinancialAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return await apiRequest(`/api/analytics/financial?${params}`)
  },
  async getLoanAnalytics(startDate = null, endDate = null) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return await apiRequest(`/api/analytics/loans?${params}`)
  },
  async getHouseholdAnalytics() {
    return await apiRequest('/api/analytics/household')
  },
  async getComparativeAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return await apiRequest(`/api/analytics/comparative?${params}`)
  },
  async getDashboardAnalytics() {
    return await apiRequest('/api/analytics/dashboard')
  },
  async getFinancialMonthSummary(year, month) {
    const params = new URLSearchParams()
    if (year) params.append('year', year)
    if (month) params.append('month', month)
    return await apiRequest(`/api/analytics/financial-month?${params}`)
  },
  async getAllAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return await apiRequest(`/api/analytics/all?${params}`)
  }
}
