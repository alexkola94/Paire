/**
 * Loan Payment Service
 */

import { request } from '../../../shared/services/apiClient';

export const loanPaymentService = {
  async getByLoan(loanId) { return request('get', `/api/loanpayments/by-loan/${loanId}`); },
  async getAll() { return request('get', '/api/loanpayments'); },
  async create(data) { return request('post', '/api/loanpayments', data); },
  async update(id, data) { return request('put', `/api/loanpayments/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/loanpayments/${id}`); },
  async getSummary(loanId) { return request('get', `/api/loanpayments/summary/${loanId}`); },
};
