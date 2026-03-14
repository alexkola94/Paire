import { apiRequest } from '../../../shared/services/apiClient'

export const aiGatewayService = {
  async chat(messages, options = {}) {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.message
    }))
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        messages: formattedMessages,
        model: options.model || null,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1024,
        stream: false,
        skipPolishing: false
      })
    }
    if (options.signal) fetchOptions.signal = options.signal
    return await apiRequest('/api/ai-gateway/chat', fetchOptions)
  },

  async ragQuery(query, options = {}) {
    const conversationHistory = options.history?.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.message
    })) || []
    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({
        query: query.trim(),
        conversationHistory,
        conversationId: options.conversationId || null
      })
    }
    if (options.signal) fetchOptions.signal = options.signal
    return await apiRequest('/api/ai-gateway/rag-query', fetchOptions)
  },

  async ragRefresh() {
    return await apiRequest('/api/ai-gateway/rag-refresh', { method: 'POST' })
  },

  async isAvailable() {
    try {
      await apiRequest('/api/ai-gateway/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          maxTokens: 1
        })
      })
      return true
    } catch (error) {
      if (error.message?.includes('503') || error.message?.includes('not configured')) {
        return false
      }
      return true
    }
  }
}
