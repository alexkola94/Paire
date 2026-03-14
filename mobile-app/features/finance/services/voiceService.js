/**
 * Voice Service
 */

import { request } from '../../../shared/services/apiClient';

export const voiceService = {
  async parseVoice(text, language = 'en') {
    return request('post', '/api/transactions/parse-voice', { text, language });
  },
};
