import { apiRequest } from '../../../shared/services/apiClient'

export const partnershipService = {
  async getMyPartnerships() {
    return await apiRequest('/api/partnership')
  },
  async createPartnership(partnerId) {
    return await apiRequest('/api/partnership', {
      method: 'POST',
      body: JSON.stringify({ partnerId })
    })
  },
  async findUserByEmail(email) {
    return await apiRequest(`/api/users/find-by-email?email=${encodeURIComponent(email)}`)
  },
  async endPartnership(partnershipId) {
    await apiRequest(`/api/partnership/${partnershipId}`, { method: 'DELETE' })
  },
  async sendInvitation(email) {
    return await apiRequest('/api/partnership/invite', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },
  async getInvitationDetails(token) {
    return await apiRequest(`/api/partnership/invitation/${token}`)
  },
  async acceptInvitation(token) {
    return await apiRequest('/api/partnership/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  },
  async getPendingInvitations() {
    return await apiRequest('/api/partnership/pending-invitations')
  }
}
