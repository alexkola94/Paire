import { apiRequest } from '../../../shared/services/apiClient'

export const voiceService = {
  async parseVoice(text, language) {
    return await apiRequest('/api/transactions/parse-voice', {
      method: 'POST',
      body: JSON.stringify({ text, language })
    })
  }
}
