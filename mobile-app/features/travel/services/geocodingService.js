/**
 * Geocoding (location search via backend) Service
 */

import { request, getCurrentUser } from '../../../shared/services/apiClient';

export const geocodingService = {
  async search(query, limit = 5) {
    getCurrentUser();
    const params = new URLSearchParams({ q: String(query).trim(), limit: String(limit) });
    return request('get', `/api/travel/geocode?${params.toString()}`);
  },
};
