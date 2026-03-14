import { apiRequest } from '../../../shared/services/apiClient'

export const loanPaymentService = {
  async getByLoan(loanId) {
    return await apiRequest(`/api/loanpayments/by-loan/${loanId}`)
  },
  async getAll() {
    return await apiRequest('/api/loanpayments')
  },
  async create(paymentData) {
    return await apiRequest('/api/loanpayments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    })
  },
  async update(id, paymentData) {
    return await apiRequest(`/api/loanpayments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...paymentData })
    })
  },
  async delete(id) {
    await apiRequest(`/api/loanpayments/${id}`, { method: 'DELETE' })
  },
  async getSummary(loanId) {
    return await apiRequest(`/api/loanpayments/summary/${loanId}`)
  }
}
