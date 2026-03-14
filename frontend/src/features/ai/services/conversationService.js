import { apiRequest } from '../../../shared/services/apiClient'

export const conversationService = {
  async getConversations(includeArchived = false) {
    return await apiRequest(`/api/conversations?includeArchived=${includeArchived}`)
  },
  async getMessages(conversationId, page = 1, pageSize = 50) {
    return await apiRequest(`/api/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`)
  },
  async createConversation(title) {
    return await apiRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    })
  },
  async updateTitle(conversationId, title) {
    return await apiRequest(`/api/conversations/${conversationId}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    })
  },
  async deleteConversation(conversationId) {
    return await apiRequest(`/api/conversations/${conversationId}`, { method: 'DELETE' })
  },
  async archiveConversation(conversationId) {
    return await apiRequest(`/api/conversations/${conversationId}/archive`, { method: 'POST' })
  }
}
