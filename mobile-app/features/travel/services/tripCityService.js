/**
 * Trip Cities (multi-city support) Service
 */

import { request, getCurrentUser } from '../../../shared/services/apiClient';

export const tripCityService = {
  async getByTrip(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/cities`); },
  async create(tripId, city) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/cities`, city); },
  async update(tripId, cityId, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${tripId}/cities/${cityId}`, updates); },
  async delete(tripId, cityId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/cities/${cityId}`); },
  async reorder(tripId, orderedCityIds) { getCurrentUser(); await request('post', `/api/travel/trips/${tripId}/cities/reorder`, orderedCityIds); },
};
