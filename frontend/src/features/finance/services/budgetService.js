import { apiRequest } from '../../../shared/services/apiClient'

export const budgetService = {
  async getAll() {
    return await apiRequest('/api/budgets')
  },
  async getById(id) {
    return await apiRequest(`/api/budgets/${id}`)
  },
  async create(budgetData) {
    const now = new Date()
    const budget = {
      ...budgetData,
      startDate: budgetData.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: budgetData.endDate || null,
      spentAmount: 0,
      isActive: true
    }
    return await apiRequest('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budget)
    })
  },
  async update(id, budgetData) {
    return await apiRequest(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...budgetData })
    })
  },
  async delete(id) {
    await apiRequest(`/api/budgets/${id}`, { method: 'DELETE' })
  }
}
