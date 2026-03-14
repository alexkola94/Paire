/**
 * Savings Goal Service
 */

import { request } from '../../../shared/services/apiClient';

export const savingsGoalService = {
  async getAll() { return request('get', '/api/savingsgoals'); },
  async getById(id) { return request('get', `/api/savingsgoals/${id}`); },
  async create(data) { return request('post', '/api/savingsgoals', data); },
  async update(id, data) { return request('put', `/api/savingsgoals/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/savingsgoals/${id}`); },
  async addDeposit(id, amount) { return request('post', `/api/savingsgoals/${id}/deposit`, { amount }); },
  async withdraw(id, amount) { return request('post', `/api/savingsgoals/${id}/withdraw`, { amount }); },
  async getSummary() { return request('get', '/api/savingsgoals/summary'); },
};
