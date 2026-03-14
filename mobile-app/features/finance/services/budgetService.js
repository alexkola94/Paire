/**
 * Budget Service
 */

import { request } from '../../../shared/services/apiClient';

export const budgetService = {
  async getAll() { return request('get', '/api/budgets'); },
  async getById(id) { return request('get', `/api/budgets/${id}`); },
  async create(data) {
    const now = new Date();
    const budget = {
      ...data,
      startDate: data.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: data.endDate || null,
      spentAmount: 0,
      isActive: true,
    };
    return request('post', '/api/budgets', budget);
  },
  async update(id, data) { return request('put', `/api/budgets/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/budgets/${id}`); },
};
