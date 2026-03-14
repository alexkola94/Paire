import { apiRequest } from '../../../shared/services/apiClient'

export const transactionService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams()
    if (filters.type) params.append('type', filters.type)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.page) params.append('page', filters.page)
    if (filters.pageSize) params.append('pageSize', filters.pageSize)
    if (filters.search) params.append('search', filters.search)
    return await apiRequest(`/api/transactions?${params}`)
  },

  async getReceipts(filters = {}) {
    const params = new URLSearchParams()
    if (filters.category) params.append('category', filters.category)
    if (filters.search) params.append('search', filters.search)
    return await apiRequest(`/api/transactions/receipts?${params}`)
  },

  async deleteReceipt(transactionId) {
    return await apiRequest(`/api/transactions/${transactionId}/receipt`, { method: 'DELETE' })
  },

  async getById(id) {
    return await apiRequest(`/api/transactions/${id}`)
  },

  async create(transaction) {
    return await apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    })
  },

  async update(id, updates) {
    return await apiRequest(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async delete(id) {
    await apiRequest(`/api/transactions/${id}`, { method: 'DELETE' })
  },

  async getSummary(startDate, endDate) {
    const transactions = await this.getAll({ startDate, endDate })
    const summary = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'expense') acc.expenses += transaction.amount
      else if (transaction.type === 'income') acc.income += transaction.amount
      return acc
    }, { income: 0, expenses: 0 })
    summary.balance = summary.income - summary.expenses
    return summary
  }
}
