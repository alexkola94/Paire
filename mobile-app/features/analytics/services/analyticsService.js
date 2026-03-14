/**
 * Analytics Service
 */

import { request } from '../../../shared/services/apiClient';

export const analyticsService = {
  async getFinancialAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/financial?${params}`);
  },
  async getLoanAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/loans?${params}`);
  },
  async getHouseholdAnalytics() { return request('get', '/api/analytics/household'); },
  async getComparativeAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/comparative?${params}`);
  },
  async getDashboardAnalytics() { return request('get', '/api/analytics/dashboard'); },
  async getAllAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/all?${params}`);
  },
};
