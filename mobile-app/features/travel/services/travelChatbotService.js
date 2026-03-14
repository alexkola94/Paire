/**
 * Travel Chatbot Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../../../shared/services/apiClient';

export const travelChatbotService = {
  async sendQuery(query, history = [], language, tripContext = null) {
    const lang = language || (await AsyncStorage.getItem('language')) || 'en';
    const body = { query, history, language: lang };
    if (tripContext) body.tripContext = tripContext;
    return request('post', '/api/travel-chatbot/query', body);
  },
  async getSuggestions(language) {
    const lang = language || (await AsyncStorage.getItem('language')) || 'en';
    return request('get', `/api/travel-chatbot/suggestions?language=${lang}`);
  },
};
