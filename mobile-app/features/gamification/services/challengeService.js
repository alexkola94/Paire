/**
 * Challenge Service
 */

import { request } from '../../../shared/services/apiClient';

export const challengeService = {
  async getAvailable() { return request('get', '/api/challenges/available'); },
  async getUserChallenges(status) {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return request('get', `/api/challenges${params}`);
  },
  async join(challengeId) { return request('post', `/api/challenges/${challengeId}/join`); },
  async claimReward(userChallengeId) { return request('post', `/api/challenges/${userChallengeId}/claim`); },
};
