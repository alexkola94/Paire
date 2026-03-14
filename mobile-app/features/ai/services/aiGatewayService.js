/**
 * AI Gateway Service
 */

import { request } from '../../../shared/services/apiClient';

export const aiGatewayService = {
  async chat(messages, options = {}) {
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.message,
    }));
    const payload = {
      messages: formattedMessages,
      model: options.model || null,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1024,
      stream: false,
      skipPolishing: false,
    };
    if (options.attachments?.length) payload.attachments = options.attachments;
    return request('post', '/api/ai-gateway/chat', payload);
  },
  async ragQuery(query, options = {}) {
    const conversationHistory =
      options.history?.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.message,
      })) || [];
    const payload = { query: query.trim(), conversationHistory };
    if (options.attachments?.length) payload.attachments = options.attachments;
    if (options.conversationId) payload.conversationId = options.conversationId;
    return request('post', '/api/ai-gateway/rag-query', payload);
  },
  async ragRefresh() { return request('post', '/api/ai-gateway/rag-refresh'); },
  async isAvailable() {
    try {
      await request('post', '/api/ai-gateway/chat', {
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      });
      return true;
    } catch (error) {
      if (error.response?.status === 503) return false;
      return true;
    }
  },
};
