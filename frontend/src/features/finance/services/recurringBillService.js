import { apiRequest } from '../../../shared/services/apiClient'

export const recurringBillService = {
  async getAll() {
    return await apiRequest('/api/recurringbills')
  },
  async getById(id) {
    return await apiRequest(`/api/recurringbills/${id}`)
  },
  async create(billData) {
    return await apiRequest('/api/recurringbills', {
      method: 'POST',
      body: JSON.stringify(billData)
    })
  },
  async update(id, billData) {
    return await apiRequest(`/api/recurringbills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...billData })
    })
  },
  async delete(id) {
    await apiRequest(`/api/recurringbills/${id}`, { method: 'DELETE' })
  },
  async markPaid(id) {
    return await apiRequest(`/api/recurringbills/${id}/mark-paid`, { method: 'POST' })
  },
  async unmarkPaid(id) {
    return await apiRequest(`/api/recurringbills/${id}/unmark-paid`, { method: 'POST' })
  },
  async getUpcoming(days = 30) {
    return await apiRequest(`/api/recurringbills/upcoming?days=${days}`)
  },
  async getSummary() {
    return await apiRequest('/api/recurringbills/summary')
  },
  async uploadAttachment(id, file) {
    const formData = new FormData()
    formData.append('file', file)
    return await apiRequest(`/api/recurringbills/${id}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {}
    })
  },
  async deleteAttachment(id, attachmentId) {
    await apiRequest(`/api/recurringbills/${id}/attachments/${attachmentId}`, { method: 'DELETE' })
  }
}
