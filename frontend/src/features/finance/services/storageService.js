import { apiRequest } from '../../../shared/services/apiClient'

export const storageService = {
  async uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiRequest('/api/transactions/receipt', {
      method: 'POST',
      body: formData,
      headers: {}
    })
    return response
  },

  async deleteFile() {
    throw new Error('File deletion not implemented yet') // i18n-ignore
  },

  getPublicUrl() {
    return ''
  }
}
