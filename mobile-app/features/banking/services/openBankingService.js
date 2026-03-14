/**
 * Open Banking / Bank Linking (Plaid) Service
 */

import { request } from '../../../shared/services/apiClient';

export const openBankingService = {
  async createLinkToken() {
    const data = await request('post', '/api/open-banking/link-token', {});
    return data?.link_token;
  },
  async exchangePublicToken(publicToken, metadata = {}) {
    return request('post', '/api/open-banking/exchange-token', {
      publicToken,
      institutionId: metadata?.institution?.institution_id,
      institutionName: metadata?.institution?.name,
    });
  },
  async getAccounts() { return request('get', '/api/open-banking/accounts'); },
};
