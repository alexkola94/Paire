/**
 * Recurring Bill Service
 */

import { request } from '../../../shared/services/apiClient';

export const recurringBillService = {
  async getAll() { return request('get', '/api/recurringbills'); },
  async getById(id) { return request('get', `/api/recurringbills/${id}`); },
  async create(data) { return request('post', '/api/recurringbills', data); },
  async update(id, data) { return request('put', `/api/recurringbills/${id}`, data); },
  async delete(id) { await request('delete', `/api/recurringbills/${id}`); },
  async markPaid(id) { return request('post', `/api/recurringbills/${id}/mark-paid`); },
  async unmarkPaid(id) { return request('post', `/api/recurringbills/${id}/unmark-paid`); },
  async getUpcoming(days = 30) { return request('get', `/api/recurringbills/upcoming?days=${days}`); },
  async getSummary() { return request('get', '/api/recurringbills/summary'); },
  async uploadAttachment(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('post', `/api/recurringbills/${id}/attachments`, formData);
  },
  async deleteAttachment(id, attachmentId) {
    await request('delete', `/api/recurringbills/${id}/attachments/${attachmentId}`);
  },
};
