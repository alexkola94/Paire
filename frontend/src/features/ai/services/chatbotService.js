import { apiRequest } from '../../../shared/services/apiClient'
import { getToken } from '../../auth/services/auth'
import { getBackendUrl } from '../../../shared/utils/getBackendUrl'

export const chatbotService = {
  async sendQuery(query, history = [], conversationId = null) {
    const language = localStorage.getItem('language') || 'en'
    return await apiRequest('/api/chatbot/query', {
      method: 'POST',
      body: JSON.stringify({ query, history, language, conversationId })
    })
  },

  async getSuggestions() {
    const language = localStorage.getItem('language') || 'en'
    return await apiRequest(`/api/chatbot/suggestions?language=${language}`)
  },

  async generateReport(params) {
    const language = localStorage.getItem('language') || 'en'
    let backendApiUrl = getBackendUrl()
    if (typeof window !== 'undefined' && window.location) {
      const currentHostname = window.location.hostname
      const currentProtocol = window.location.protocol
      if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1' && backendApiUrl.includes('localhost')) {
        backendApiUrl = `${currentProtocol}//${currentHostname}:5038`
      }
    }
    backendApiUrl = backendApiUrl.replace(/\/+$/, '')
    const token = getToken()
    const response = await fetch(`${backendApiUrl}/api/chatbot/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        reportType: params.reportType,
        format: params.format || 'csv',
        startDate: params.startDate,
        endDate: params.endDate,
        category: params.category || null,
        groupBy: params.groupBy || 'category',
        language
      })
    })
    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.statusText}`)
    }
    return await response.blob()
  },

  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
}
