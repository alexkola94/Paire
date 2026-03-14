/**
 * Saved Places (POI pinning) Service
 */

import { request, getCurrentUser } from '../../../shared/services/apiClient';

export const savedPlaceService = {
  async getByTrip(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/saved-places`); },
  async create(tripId, place) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/saved-places`, place); },
  async delete(tripId, placeId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/saved-places/${placeId}`); },
};
