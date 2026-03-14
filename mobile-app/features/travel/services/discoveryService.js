/**
 * Discovery API Service (backend search)
 */

import { request } from '../../../shared/services/apiClient';

export const discoveryService = {
  async search(params) {
    const query = new URLSearchParams(params);
    return request('get', `/api/discovery/search?${query}`);
  },
};
