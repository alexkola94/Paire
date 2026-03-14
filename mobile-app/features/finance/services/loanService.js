/**
 * Loan Service
 */

import { request } from '../../../shared/services/apiClient';

export const loanService = {
  async getAll() { return request('get', '/api/loans'); },
  async getById(id) { return request('get', `/api/loans/${id}`); },
  async create(loan) { return request('post', '/api/loans', loan); },
  async update(id, updates) { return request('put', `/api/loans/${id}`, updates); },
  async delete(id) { await request('delete', `/api/loans/${id}`); },
};
