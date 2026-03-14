/**
 * Greece Economic Data Service
 */

import { request } from '../../../shared/services/apiClient';

export const economicService = {
  async getCPI() { return request('get', '/api/economicdata/cpi'); },
  async getFoodPrices() { return request('get', '/api/economicdata/food-prices'); },
  async getIndicators() { return request('get', '/api/economicdata/indicators'); },
  async getNews() { return request('get', '/api/economicdata/news'); },
  async getAll() { return request('get', '/api/economicdata/all'); },
};
