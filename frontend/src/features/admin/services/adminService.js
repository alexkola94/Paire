import { apiRequest } from '../../../shared/services/apiClient'

export const adminService = {
  async getStats() {
    return await apiRequest('/api/admin/stats')
  },
  async getUsers(page = 1, pageSize = 20, search = '') {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('pageSize', pageSize)
    if (search) params.append('search', search)
    return await apiRequest(`/api/admin/users?${params}`)
  },
  async getLogs(count = 50, level = null) {
    let url = `/api/admin/logs?count=${count}`
    if (level && level !== 'All') url += `&level=${level}`
    return await apiRequest(url)
  },
  async getJobs() {
    return await apiRequest('/api/admin/jobs')
  },
  async lockUser(userId) {
    return await apiRequest(`/api/admin/users/${userId}/lock`, { method: 'POST' })
  },
  async unlockUser(userId) {
    return await apiRequest(`/api/admin/users/${userId}/unlock`, { method: 'POST' })
  },
  async resetTwoFactor(userId) {
    return await apiRequest(`/api/admin/users/${userId}/reset-2fa`, { method: 'POST' })
  },
  async triggerJob(jobName) {
    return await apiRequest(`/api/admin/jobs/${jobName}/trigger`, { method: 'POST' })
  },
  async getPerformanceMetrics() {
    return await apiRequest('/api/admin/monitoring/metrics')
  },
  async getDatabaseHealth() {
    return await apiRequest('/api/admin/monitoring/database')
  },
  async getActiveSessions() {
    return await apiRequest('/api/admin/monitoring/sessions')
  },
  async getAuditLogs(filters = {}, page = 1, pageSize = 50) {
    const params = new URLSearchParams()
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.action) params.append('action', filters.action)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    params.append('page', page)
    params.append('pageSize', pageSize)
    return await apiRequest(`/api/admin/audit/logs?${params}`)
  },
  async getSecurityAlerts() {
    return await apiRequest('/api/admin/audit/security-alerts')
  }
}
