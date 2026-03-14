/**
 * File Attachments / Storage Service
 */

import { request } from '../../../shared/services/apiClient';

export const storageService = {
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('post', '/api/transactions/receipt', formData);
  },
};
