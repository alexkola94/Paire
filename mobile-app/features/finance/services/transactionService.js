/**
 * Transaction Service
 */

import { request } from '../../../shared/services/apiClient';

export const transactionService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    if (filters.search) params.append('search', filters.search);
    return request('get', `/api/transactions?${params}`);
  },
  async getReceipts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    return request('get', `/api/transactions/receipts?${params}`);
  },
  async deleteReceipt(transactionId) {
    return request('delete', `/api/transactions/${transactionId}/receipt`);
  },
  async getById(id) { return request('get', `/api/transactions/${id}`); },
  async create(transaction) { return request('post', '/api/transactions', transaction); },
  async update(id, updates) { return request('put', `/api/transactions/${id}`, updates); },
  async delete(id) { await request('delete', `/api/transactions/${id}`); },
  async getSummary(startDate, endDate) {
    const transactions = await this.getAll({ startDate, endDate });
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.type === 'expense') acc.expenses += t.amount;
        else if (t.type === 'income') acc.income += t.amount;
        return acc;
      },
      { income: 0, expenses: 0 }
    );
    summary.balance = summary.income - summary.expenses;
    return summary;
  },
};
