import { apiRequest } from '../../../shared/services/apiClient'

export const savingsGoalService = {
  async getAll() {
    return await apiRequest('/api/savingsgoals')
  },
  async getById(id) {
    return await apiRequest(`/api/savingsgoals/${id}`)
  },
  async create(goalData) {
    return await apiRequest('/api/savingsgoals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    })
  },
  async update(id, goalData) {
    return await apiRequest(`/api/savingsgoals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...goalData })
    })
  },
  async delete(id) {
    await apiRequest(`/api/savingsgoals/${id}`, { method: 'DELETE' })
  },
  async addDeposit(id, amount) {
    return await apiRequest(`/api/savingsgoals/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  },
  async withdraw(id, amount) {
    return await apiRequest(`/api/savingsgoals/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  },
  async getSummary() {
    return await apiRequest('/api/savingsgoals/summary')
  }
}
