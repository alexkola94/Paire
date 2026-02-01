/**
 * API Service for database operations
 * Ported from frontend/src/services/api.js
 * Uses axios with JWT auth and CSRF protection
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, getStoredUser } from './auth';
import { isTokenExpired } from '../utils/tokenUtils';
import { getCsrfToken, clearCsrfCache } from './csrf';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Session expiration callback
let onSessionExpired = null;
export const setApiSessionExpiredCallback = (callback) => {
  onSessionExpired = callback;
};

const handleSessionExpiration = () => {
  onSessionExpired?.();
};

const getCurrentUser = () => {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) throw new Error('User not authenticated');
  return user;
};

/**
 * Create configured axios instance
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT + CSRF
api.interceptors.request.use(async (config) => {
  const token = getToken();

  if (token && isTokenExpired(token)) {
    handleSessionExpiration();
    return Promise.reject(new Error('Session expired. Please log in again.'));
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // CSRF on state-changing methods
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) config.headers['X-CSRF-TOKEN'] = csrfToken;
    } catch (e) {
      console.warn('Could not get CSRF token:', e.message);
    }
  }

  // Don't set Content-Type for FormData (let axios handle boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Response interceptor: handle 401 and CSRF errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      handleSessionExpiration();
    }

    if (error.response?.status === 400) {
      const body = error.response.data;
      if (typeof body === 'string' && body.toLowerCase().includes('csrf')) {
        clearCsrfCache();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to make requests and return data
 */
const request = async (method, url, data, config = {}) => {
  const response = await api({ method, url, data, ...config });
  return response.data;
};

// ========================================
// Transactions
// ========================================

export const transactionService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    if (filters.search) params.append('search', filters.search);
    return request('get', `/api/transactions?${params}`);
  },

  async getReceipts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    return request('get', `/api/transactions/receipts?${params}`);
  },

  async deleteReceipt(transactionId) {
    return request('delete', `/api/transactions/${transactionId}/receipt`);
  },

  async getById(id) {
    return request('get', `/api/transactions/${id}`);
  },

  async create(transaction) {
    return request('post', '/api/transactions', transaction);
  },

  async update(id, updates) {
    return request('put', `/api/transactions/${id}`, updates);
  },

  async delete(id) {
    await request('delete', `/api/transactions/${id}`);
  },

  async getSummary(startDate, endDate) {
    const transactions = await this.getAll({ startDate, endDate });
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.type === 'expense') acc.expenses += t.amount;
        else if (t.type === 'income') acc.income += t.amount;
        return acc;
      },
      { income: 0, expenses: 0 }
    );
    summary.balance = summary.income - summary.expenses;
    return summary;
  },
};

// ========================================
// Loans
// ========================================

export const loanService = {
  async getAll() { return request('get', '/api/loans'); },
  async getById(id) { return request('get', `/api/loans/${id}`); },
  async create(loan) { return request('post', '/api/loans', loan); },
  async update(id, updates) { return request('put', `/api/loans/${id}`, updates); },
  async delete(id) { await request('delete', `/api/loans/${id}`); },
};

// ========================================
// Loan Payments
// ========================================

export const loanPaymentService = {
  async getByLoan(loanId) { return request('get', `/api/loanpayments/by-loan/${loanId}`); },
  async getAll() { return request('get', '/api/loanpayments'); },
  async create(data) { return request('post', '/api/loanpayments', data); },
  async update(id, data) { return request('put', `/api/loanpayments/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/loanpayments/${id}`); },
  async getSummary(loanId) { return request('get', `/api/loanpayments/summary/${loanId}`); },
};

// ========================================
// File Attachments
// ========================================

export const storageService = {
  /**
   * Upload a receipt image. File can be a React Native asset object { uri, name, type }.
   * Returns { url, path } from backend.
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('post', '/api/transactions/receipt', formData);
  },
};

// ========================================
// Profile
// ========================================

export const profileService = {
  async getProfile(userId) { return request('get', `/api/profile/${userId}`); },
  async getMyProfile() { return request('get', '/api/profile'); },
  async updateProfile(userId, data) { return request('put', `/api/profile/${userId}`, data); },
  async updateMyProfile(data) { return request('put', '/api/profile', data); },
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await request('post', '/api/profile/avatar', formData);
    return response.avatar_url;
  },
};

// ========================================
// Partnership
// ========================================

export const partnershipService = {
  async getMyPartnerships() { return request('get', '/api/partnership'); },
  async createPartnership(partnerId) { return request('post', '/api/partnership', { partnerId }); },
  async findUserByEmail(email) { return request('get', `/api/users/find-by-email?email=${encodeURIComponent(email)}`); },
  async endPartnership(id) { await request('delete', `/api/partnership/${id}`); },
  async sendInvitation(email) { return request('post', '/api/partnership/invite', { email }); },
  async getInvitationDetails(token) { return request('get', `/api/partnership/invitation/${token}`); },
  async acceptInvitation(token) { return request('post', '/api/partnership/accept-invitation', { token }); },
  async getPendingInvitations() { return request('get', '/api/partnership/pending-invitations'); },
};

// ========================================
// Budgets
// ========================================

export const budgetService = {
  async getAll() { return request('get', '/api/budgets'); },
  async getById(id) { return request('get', `/api/budgets/${id}`); },
  async create(data) {
    const now = new Date();
    const budget = {
      ...data,
      startDate: data.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: data.endDate || null,
      spentAmount: 0,
      isActive: true,
    };
    return request('post', '/api/budgets', budget);
  },
  async update(id, data) { return request('put', `/api/budgets/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/budgets/${id}`); },
};

// ========================================
// Savings Goals
// ========================================

export const savingsGoalService = {
  async getAll() { return request('get', '/api/savingsgoals'); },
  async getById(id) { return request('get', `/api/savingsgoals/${id}`); },
  async create(data) { return request('post', '/api/savingsgoals', data); },
  async update(id, data) { return request('put', `/api/savingsgoals/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/savingsgoals/${id}`); },
  async addDeposit(id, amount) { return request('post', `/api/savingsgoals/${id}/deposit`, { amount }); },
  async withdraw(id, amount) { return request('post', `/api/savingsgoals/${id}/withdraw`, { amount }); },
  async getSummary() { return request('get', '/api/savingsgoals/summary'); },
};

// ========================================
// Recurring Bills
// ========================================

export const recurringBillService = {
  async getAll() { return request('get', '/api/recurringbills'); },
  async getById(id) { return request('get', `/api/recurringbills/${id}`); },
  async create(data) { return request('post', '/api/recurringbills', data); },
  async update(id, data) { return request('put', `/api/recurringbills/${id}`, data); },
  async delete(id) { await request('delete', `/api/recurringbills/${id}`); },
  async markPaid(id) { return request('post', `/api/recurringbills/${id}/mark-paid`); },
  async unmarkPaid(id) { return request('post', `/api/recurringbills/${id}/unmark-paid`); },
  async getUpcoming(days = 30) { return request('get', `/api/recurringbills/upcoming?days=${days}`); },
  async getSummary() { return request('get', '/api/recurringbills/summary'); },
  async uploadAttachment(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request('post', `/api/recurringbills/${id}/attachments`, formData);
  },
  async deleteAttachment(id, attachmentId) {
    await request('delete', `/api/recurringbills/${id}/attachments/${attachmentId}`);
  },
};

// ========================================
// Shopping Lists
// ========================================

export const shoppingListService = {
  async getAll() { return request('get', '/api/shoppinglists'); },
  async getById(id) { return request('get', `/api/shoppinglists/${id}`); },
  async create(data) { return request('post', '/api/shoppinglists', data); },
  async update(id, data) { return request('put', `/api/shoppinglists/${id}`, { id, ...data }); },
  async delete(id) { await request('delete', `/api/shoppinglists/${id}`); },
  async complete(id) { return request('post', `/api/shoppinglists/${id}/complete`); },
  async getItems(listId) { return request('get', `/api/shoppinglists/${listId}/items`); },
  async addItem(listId, data) { return request('post', `/api/shoppinglists/${listId}/items`, data); },
  async updateItem(listId, itemId, data) { return request('put', `/api/shoppinglists/${listId}/items/${itemId}`, { id: itemId, ...data }); },
  async deleteItem(listId, itemId) { await request('delete', `/api/shoppinglists/${listId}/items/${itemId}`); },
  async toggleItem(listId, itemId) { return request('post', `/api/shoppinglists/${listId}/items/${itemId}/toggle`); },
  async getSummary() { return request('get', '/api/shoppinglists/summary'); },
};

// ========================================
// Analytics
// ========================================

export const analyticsService = {
  async getFinancialAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/financial?${params}`);
  },
  async getLoanAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/loans?${params}`);
  },
  async getHouseholdAnalytics() { return request('get', '/api/analytics/household'); },
  async getComparativeAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/comparative?${params}`);
  },
  async getDashboardAnalytics() { return request('get', '/api/analytics/dashboard'); },
  async getAllAnalytics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request('get', `/api/analytics/all?${params}`);
  },
};

// ========================================
// Chatbot
// ========================================

export const chatbotService = {
  async sendQuery(query, history = []) {
    const language = await AsyncStorage.getItem('language') || 'en';
    return request('post', '/api/chatbot/query', { query, history, language });
  },
  async getSuggestions() {
    const language = await AsyncStorage.getItem('language') || 'en';
    return request('get', `/api/chatbot/suggestions?language=${language}`);
  },
};

// ========================================
// Travel Chatbot
// ========================================

export const travelChatbotService = {
  async sendQuery(query, history = [], language) {
    const lang = language || (await AsyncStorage.getItem('language')) || 'en';
    return request('post', '/api/travel-chatbot/query', { query, history, language: lang });
  },
  async getSuggestions(language) {
    const lang = language || (await AsyncStorage.getItem('language')) || 'en';
    return request('get', `/api/travel-chatbot/suggestions?language=${lang}`);
  },
};

// ========================================
// Travel Trips (CRUD)
// ========================================

export const travelService = {
  async getTrips() {
    getCurrentUser();
    return request('get', '/api/travel/trips');
  },
  async getTrip(id) {
    getCurrentUser();
    return request('get', `/api/travel/trips/${id}`);
  },
  async createTrip(trip) {
    getCurrentUser();
    return request('post', '/api/travel/trips', trip);
  },
  async updateTrip(id, updates) {
    getCurrentUser();
    return request('put', `/api/travel/trips/${id}`, updates);
  },
  async deleteTrip(id) {
    getCurrentUser();
    await request('delete', `/api/travel/trips/${id}`);
  },
  // Trip expenses (budget)
  async getExpenses(tripId) {
    getCurrentUser();
    return request('get', `/api/travel/trips/${tripId}/expenses`);
  },
  async createExpense(tripId, expense) {
    getCurrentUser();
    return request('post', `/api/travel/trips/${tripId}/expenses`, expense);
  },
  async updateExpense(tripId, expenseId, updates) {
    getCurrentUser();
    return request('put', `/api/travel/trips/${tripId}/expenses/${expenseId}`, updates);
  },
  async deleteExpense(tripId, expenseId) {
    getCurrentUser();
    await request('delete', `/api/travel/trips/${tripId}/expenses/${expenseId}`);
  },
  // Itinerary events
  async getEvents(tripId) {
    getCurrentUser();
    return request('get', `/api/travel/trips/${tripId}/events`);
  },
  async createEvent(tripId, evt) {
    getCurrentUser();
    return request('post', `/api/travel/trips/${tripId}/events`, evt);
  },
  async updateEvent(tripId, eventId, updates) {
    getCurrentUser();
    return request('put', `/api/travel/trips/${tripId}/events/${eventId}`, updates);
  },
  async deleteEvent(tripId, eventId) {
    getCurrentUser();
    await request('delete', `/api/travel/trips/${tripId}/events/${eventId}`);
  },
  // Packing items
  async getPackingItems(tripId) {
    getCurrentUser();
    return request('get', `/api/travel/trips/${tripId}/packing`);
  },
  async createPackingItem(tripId, item) {
    getCurrentUser();
    return request('post', `/api/travel/trips/${tripId}/packing`, item);
  },
  async updatePackingItem(tripId, itemId, updates) {
    getCurrentUser();
    return request('put', `/api/travel/trips/${tripId}/packing/${itemId}`, updates);
  },
  async deletePackingItem(tripId, itemId) {
    getCurrentUser();
    await request('delete', `/api/travel/trips/${tripId}/packing/${itemId}`);
  },
  // Documents
  async getDocuments(tripId) {
    getCurrentUser();
    return request('get', `/api/travel/trips/${tripId}/documents`);
  },
  async createDocument(tripId, doc) {
    getCurrentUser();
    return request('post', `/api/travel/trips/${tripId}/documents`, doc);
  },
  async updateDocument(tripId, docId, updates) {
    getCurrentUser();
    return request('put', `/api/travel/trips/${tripId}/documents/${docId}`, updates);
  },
  async deleteDocument(tripId, docId) {
    getCurrentUser();
    await request('delete', `/api/travel/trips/${tripId}/documents/${docId}`);
  },
};

// ========================================
// Reminders
// ========================================

export const reminderService = {
  async getSettings() {
    getCurrentUser();
    return request('get', '/api/reminders/settings');
  },
  async updateSettings(settings) { return request('put', '/api/reminders/settings', settings); },
  async sendTestEmail(email) { return request('post', `/api/reminders/test-email?email=${encodeURIComponent(email)}`); },
  async checkReminders() { return request('post', '/api/reminders/check'); },
};

// ========================================
// Achievements
// ========================================

export const achievementService = {
  async getAll() { getCurrentUser(); return request('get', '/api/achievements'); },
  async getUnlocked() { return request('get', '/api/achievements/unlocked'); },
  async getUnnotified() { return request('get', '/api/achievements/unnotified'); },
  async markAsNotified(ids) { return request('post', '/api/achievements/mark-notified', ids); },
  async check() { return request('post', '/api/achievements/check'); },
  async getStats() { return request('get', '/api/achievements/stats'); },
};

// ========================================
// Admin
// ========================================

export const adminService = {
  async getStats() { return request('get', '/api/admin/stats'); },
  async getUsers(page = 1, pageSize = 20, search = '') {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    if (search) params.append('search', search);
    return request('get', `/api/admin/users?${params}`);
  },
  async getLogs(count = 50, level = null) {
    let url = `/api/admin/system-logs?page=1&pageSize=${count}`;
    if (level && level !== 'All') url += `&level=${encodeURIComponent(level)}`;
    const result = await request('get', url);
    return result?.logs ?? result?.entries ?? result ?? [];
  },
  async getJobs() {
    const result = await request('get', '/api/admin/jobs/stats');
    const succeeded = result?.recentSucceeded ?? [];
    const failed = result?.recentFailures ?? [];
    const processing = result?.processing ?? [];
    const names = new Set([...succeeded.map((j) => j?.name), ...failed.map((j) => j?.name), ...processing.map((j) => j?.name)].filter(Boolean));
    return Array.from(names).map((name) => ({ name, id: name }));
  },
  async lockUser(userId) { return request('post', `/api/admin/users/${userId}/lock`); },
  async unlockUser(userId) { return request('post', `/api/admin/users/${userId}/unlock`); },
  async resetTwoFactor(userId) { return request('post', `/api/admin/users/${userId}/reset-2fa`); },
  async triggerJob(jobName) { return request('post', `/api/admin/jobs/${jobName}/trigger`); },
  async getPerformanceMetrics() { return request('get', '/api/admin/monitoring/metrics'); },
  async getDatabaseHealth() { return request('get', '/api/admin/monitoring/database'); },
  async getActiveSessions() { return request('get', '/api/admin/monitoring/sessions'); },
  async getAuditLogs(filters = {}, page = 1, pageSize = 50) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    params.append('page', page);
    params.append('pageSize', pageSize);
    return request('get', `/api/admin/audit/logs?${params}`);
  },
  async getSecurityAlerts() { return request('get', '/api/admin/audit/security-alerts'); },
};

// ========================================
// Two-Factor Auth
// ========================================

export const twoFactorService = {
  async setup() { return request('post', '/api/auth/2fa/setup'); },
  async enable(code) { return request('post', '/api/auth/2fa/enable', { code }); },
  async verify(email, code, tempToken) { return request('post', '/api/auth/2fa/verify', { email, code, tempToken }); },
  async disable(password) { return request('post', '/api/auth/2fa/disable', { password }); },
};

// ========================================
// Currency
// ========================================

export const currencyService = {
  async getCurrencies() { return request('get', '/api/currency/list'); },
  async getRates(baseCurrency) { return request('get', `/api/currency/rates?baseCurrency=${baseCurrency}`); },
  async convert(from, to, amount) { return request('get', `/api/currency/convert?from=${from}&to=${to}&amount=${amount}`); },
};

// ========================================
// Greece Economic Data
// ========================================

export const economicService = {
  async getCPI() { return request('get', '/api/economicdata/cpi'); },
  async getFoodPrices() { return request('get', '/api/economicdata/food-prices'); },
  async getIndicators() { return request('get', '/api/economicdata/indicators'); },
  async getNews() { return request('get', '/api/economicdata/news'); },
  async getAll() { return request('get', '/api/economicdata/all'); },
};

// ========================================
// Public Stats (No Auth)
// ========================================

export const publicStatsService = {
  async getStats() {
    const response = await axios.get(`${API_URL}/api/public/stats`);
    return response.data;
  },
};

// ========================================
// AI Gateway
// ========================================

export const aiGatewayService = {
  async chat(messages, options = {}) {
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.message,
    }));
    const payload = {
      messages: formattedMessages,
      model: options.model || null,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1024,
      stream: false,
      skipPolishing: false,
    };
    if (options.attachments?.length) payload.attachments = options.attachments;
    return request('post', '/api/ai-gateway/chat', payload);
  },

  async ragQuery(query, options = {}) {
    const conversationHistory =
      options.history?.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.message,
      })) || [];
    const payload = { query: query.trim(), conversationHistory };
    if (options.attachments?.length) payload.attachments = options.attachments;
    return request('post', '/api/ai-gateway/rag-query', payload);
  },

  async ragRefresh() { return request('post', '/api/ai-gateway/rag-refresh'); },

  async isAvailable() {
    try {
      await request('post', '/api/ai-gateway/chat', {
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      });
      return true;
    } catch (error) {
      if (error.response?.status === 503) return false;
      return true;
    }
  },
};

// ========================================
// Travel Advisory
// ========================================

export const travelAdvisoryService = {
  async getAdvisory(country) { return request('get', `/api/travel/advisory/${encodeURIComponent(country)}`); },
};

// ========================================
// Discovery
// ========================================

export const discoveryService = {
  async search(params) {
    const query = new URLSearchParams(params);
    return request('get', `/api/discovery/search?${query}`);
  },
};

// ========================================
// Flights
// ========================================

export const flightService = {
  async getStatus(flightNumber) { return request('get', `/api/flights/${encodeURIComponent(flightNumber)}`); },
};

// ========================================
// Open Banking / Bank Linking (Plaid)
// ========================================

export const openBankingService = {
  async createLinkToken() {
    getCurrentUser();
    const data = await request('post', '/api/open-banking/link-token', {});
    return data?.link_token;
  },
  async exchangePublicToken(publicToken, metadata = {}) {
    getCurrentUser();
    return request('post', '/api/open-banking/exchange-token', {
      publicToken,
      institutionId: metadata?.institution?.institution_id,
      institutionName: metadata?.institution?.name,
    });
  },
  async getAccounts() {
    getCurrentUser();
    return request('get', '/api/open-banking/accounts');
  },
};
