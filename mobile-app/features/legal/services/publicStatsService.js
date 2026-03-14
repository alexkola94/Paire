/**
 * Public Stats Service (No Auth)
 */

import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const publicStatsService = {
  async getStats() {
    const response = await axios.get(`${API_URL}/api/public/stats`);
    return response.data;
  },
};
