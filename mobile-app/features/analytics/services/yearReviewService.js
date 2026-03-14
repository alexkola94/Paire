/**
 * Year in Review Service
 */

import { request } from '../../../shared/services/apiClient';

export const yearReviewService = {
  async getYearReview(year) { return request('get', `/api/year-review/${year}`); },
  async regenerate(year) { return request('post', `/api/year-review/${year}/regenerate`); },
};
