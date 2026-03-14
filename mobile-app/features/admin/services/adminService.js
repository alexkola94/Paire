/**
 * Admin Service
 */

import { request } from '../../../shared/services/apiClient';

export const adminService = {
  async getStats() { return request('get', '/api/admin/stats'); },
  async getUsers(page = 1, pageSize = 20, search = '') {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    if (search) params.append('search', search);
    return request('get', `/api/admin/users?${params}`);
  },
  async getLogs(count = 50, level = null) {
    let url = `/api/admin/system-logs?page=1&pageSize=${count}`;
    if (level && level !== 'All') url += `&level=${encodeURIComponent(level)}`;
    const result = await request('get', url);
    return result?.logs ?? result?.entries ?? result ?? [];
  },
  async getJobs() {
    const result = await request('get', '/api/admin/jobs/stats');
    const succeeded = result?.recentSucceeded ?? [];
    const failed = result?.recentFailures ?? [];
    const processing = result?.processing ?? [];
    const names = new Set([...succeeded.map((j) => j?.name), ...failed.map((j) => j?.name), ...processing.map((j) => j?.name)].filter(Boolean));
    return Array.from(names).map((name) => ({ name, id: name }));
  },
  async lockUser(userId) { return request('post', `/api/admin/users/${userId}/lock`); },
  async unlockUser(userId) { return request('post', `/api/admin/users/${userId}/unlock`); },
  async resetTwoFactor(userId) { return request('post', `/api/admin/users/${userId}/reset-2fa`); },
  async triggerJob(jobName) { return request('post', `/api/admin/jobs/${jobName}/trigger`); },
  async getPerformanceMetrics() { return request('get', '/api/admin/monitoring/metrics'); },
  async getDatabaseHealth() { return request('get', '/api/admin/monitoring/database'); },
  async getActiveSessions() { return request('get', '/api/admin/monitoring/sessions'); },
  async getAuditLogs(filters = {}, page = 1, pageSize = 50) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    params.append('page', page);
    params.append('pageSize', pageSize);
    return request('get', `/api/admin/audit/logs?${params}`);
  },
  async getSecurityAlerts() { return request('get', '/api/admin/audit/security-alerts'); },
};
