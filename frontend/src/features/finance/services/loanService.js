import { apiRequest } from '../../../shared/services/apiClient'

export const loanService = {
  async getAll() {
    return await apiRequest('/api/loans')
  },
  async getById(id) {
    return await apiRequest(`/api/loans/${id}`)
  },
  async create(loan) {
    return await apiRequest('/api/loans', {
      method: 'POST',
      body: JSON.stringify(loan)
    })
  },
  async update(id, updates) {
    return await apiRequest(`/api/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },
  async delete(id) {
    await apiRequest(`/api/loans/${id}`, { method: 'DELETE' })
  }
}
