import { apiRequest } from '../../../shared/services/apiClient'

export const travelChatbotService = {
  async sendQuery(query, history = [], language, tripContext = null) {
    const lang = language || localStorage.getItem('language') || 'en'
    const body = { query, history, language: lang }
    if (tripContext && typeof tripContext === 'object') {
      body.tripContext = tripContext
    }
    return await apiRequest('/api/travel-chatbot/query', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },
  async getSuggestions(language) {
    const lang = (language ?? localStorage.getItem('language')) || 'en'
    return await apiRequest(`/api/travel-chatbot/suggestions?language=${lang}`)
  }
}
