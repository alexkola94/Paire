import { getBackendUrl } from '../../../shared/utils/getBackendUrl'

const publicApiRequest = async (url) => {
  let backendApiUrl = getBackendUrl()
  if (typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname
    const currentProtocol = window.location.protocol
    if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1' && backendApiUrl.includes('localhost')) {
      backendApiUrl = `${currentProtocol}//${currentHostname}:5038`
    }
  }
  backendApiUrl = backendApiUrl.replace(/\/+$/, '')
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  const fullUrl = `${backendApiUrl}${normalizedUrl}`
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

export const publicStatsService = {
  async getStats() {
    return await publicApiRequest('/api/public/stats')
  }
}
