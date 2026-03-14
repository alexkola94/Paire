/**
 * Partnership Service
 */

import { request } from '../../../shared/services/apiClient';

export const partnershipService = {
  async getMyPartnerships() { return request('get', '/api/partnership'); },
  async createPartnership(partnerId) { return request('post', '/api/partnership', { partnerId }); },
  async findUserByEmail(email) { return request('get', `/api/users/find-by-email?email=${encodeURIComponent(email)}`); },
  async endPartnership(id) { await request('delete', `/api/partnership/${id}`); },
  async sendInvitation(email) { return request('post', '/api/partnership/invite', { email }); },
  async getInvitationDetails(token) { return request('get', `/api/partnership/invitation/${token}`); },
  async acceptInvitation(token) { return request('post', '/api/partnership/accept-invitation', { token }); },
  async getPendingInvitations() { return request('get', '/api/partnership/pending-invitations'); },
};
