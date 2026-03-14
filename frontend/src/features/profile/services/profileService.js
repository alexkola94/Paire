import { apiRequest } from '../../../shared/services/apiClient'

export const profileService = {
  async getProfile(userId) {
    return await apiRequest(`/api/profile/${userId}`)
  },
  async getMyProfile() {
    return await apiRequest('/api/profile')
  },
  async updateProfile(userId, profileData) {
    return await apiRequest(`/api/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  },
  async updateMyProfile(profileData) {
    return await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  },
  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiRequest('/api/profile/avatar', {
      method: 'POST',
      body: formData,
      headers: {}
    })
    return response.avatar_url
  }
}
