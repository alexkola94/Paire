/**
 * Travel Advisory Service
 */

import { request } from '../../../shared/services/apiClient';

export const travelAdvisoryService = {
  async getAdvisory(country) { return request('get', `/api/travel/advisory/${encodeURIComponent(country)}`); },
};
