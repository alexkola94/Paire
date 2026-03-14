/**
 * Chatbot Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../../../shared/services/apiClient';

export const chatbotService = {
  async sendQuery(query, history = [], conversationId = null) {
    const language = await AsyncStorage.getItem('language') || 'en';
    return request('post', '/api/chatbot/query', { query, history, language, conversationId });
  },
  async getSuggestions() {
    const language = await AsyncStorage.getItem('language') || 'en';
    return request('get', `/api/chatbot/suggestions?language=${language}`);
  },
};
