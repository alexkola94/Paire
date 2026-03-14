/**
 * Conversations (AI Memory) Service
 */

import { request } from '../../../shared/services/apiClient';

export const conversationService = {
  async getConversations(includeArchived = false) {
    return request('get', `/api/conversations?includeArchived=${includeArchived}`);
  },
  async getMessages(conversationId, page = 1, pageSize = 50) {
    return request('get', `/api/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`);
  },
  async createConversation(title) { return request('post', '/api/conversations', { title }); },
  async deleteConversation(conversationId) { return request('delete', `/api/conversations/${conversationId}`); },
};
