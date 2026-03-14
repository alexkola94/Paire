/**
 * Profile Service
 */

import { request } from '../../../shared/services/apiClient';

export const profileService = {
  async getProfile(userId) { return request('get', `/api/profile/${userId}`); },
  async getMyProfile() { return request('get', '/api/profile'); },
  async updateProfile(userId, data) { return request('put', `/api/profile/${userId}`, data); },
  async updateMyProfile(data) { return request('put', '/api/profile', data); },
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await request('post', '/api/profile/avatar', formData);
    return response?.avatar_url ?? response?.avatarUrl;
  },
};
