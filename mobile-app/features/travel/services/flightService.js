/**
 * Flight Service
 */

import { request } from '../../../shared/services/apiClient';

export const flightService = {
  async getStatus(flightNumber) { return request('get', `/api/flights/${encodeURIComponent(flightNumber)}`); },
};
