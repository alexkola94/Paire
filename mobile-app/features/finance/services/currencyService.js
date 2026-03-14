/**
 * Currency Service
 */

import { request } from '../../../shared/services/apiClient';

export const currencyService = {
  async getCurrencies() { return request('get', '/api/currency/list'); },
  async getRates(baseCurrency) { return request('get', `/api/currency/rates?baseCurrency=${baseCurrency}`); },
  async convert(from, to, amount) { return request('get', `/api/currency/convert?from=${from}&to=${to}&amount=${amount}`); },
};
