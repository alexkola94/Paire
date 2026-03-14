import { apiRequest } from '../../../shared/services/apiClient'

export const shoppingListService = {
  async getAll() {
    return await apiRequest('/api/shoppinglists')
  },
  async getById(id) {
    return await apiRequest(`/api/shoppinglists/${id}`)
  },
  async create(listData) {
    return await apiRequest('/api/shoppinglists', {
      method: 'POST',
      body: JSON.stringify(listData)
    })
  },
  async update(id, listData) {
    return await apiRequest(`/api/shoppinglists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...listData })
    })
  },
  async delete(id) {
    await apiRequest(`/api/shoppinglists/${id}`, { method: 'DELETE' })
  },
  async complete(id) {
    return await apiRequest(`/api/shoppinglists/${id}/complete`, { method: 'POST' })
  },
  async getItems(listId) {
    return await apiRequest(`/api/shoppinglists/${listId}/items`)
  },
  async addItem(listId, itemData) {
    return await apiRequest(`/api/shoppinglists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    })
  },
  async updateItem(listId, itemId, itemData) {
    return await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ id: itemId, ...itemData })
    })
  },
  async deleteItem(listId, itemId) {
    await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}`, { method: 'DELETE' })
  },
  async toggleItem(listId, itemId) {
    return await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}/toggle`, { method: 'POST' })
  },
  async getSummary() {
    return await apiRequest('/api/shoppinglists/summary')
  }
}
