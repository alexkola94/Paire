/**
 * Travel Notifications Service
 */

import { request, getCurrentUser } from '../../../shared/services/apiClient';

export const travelNotificationsService = {
  async getNotifications(params = {}) {
    getCurrentUser();
    const q = new URLSearchParams();
    if (params.tripId != null) q.set('tripId', params.tripId);
    if (params.unreadOnly != null) q.set('unreadOnly', params.unreadOnly);
    if (params.limit != null) q.set('limit', params.limit);
    const query = q.toString();
    return request('get', `/api/travel/notifications${query ? `?${query}` : ''}`);
  },
  async getUnreadCount(tripId = null) {
    getCurrentUser();
    const q = tripId != null ? `?tripId=${tripId}` : '';
    return request('get', `/api/travel/notifications/unread${q}`);
  },
  async markAsRead(id) { getCurrentUser(); return request('put', `/api/travel/notifications/${id}/read`); },
  async markAllAsRead(tripId = null) {
    getCurrentUser();
    const q = tripId != null ? `?tripId=${tripId}` : '';
    return request('post', `/api/travel/notifications/mark-all-read${q}`);
  },
  async deleteNotification(id) { getCurrentUser(); return request('delete', `/api/travel/notifications/${id}`); },
  async getPreferences(tripId = null) {
    getCurrentUser();
    const q = tripId != null ? `?tripId=${tripId}` : '';
    return request('get', `/api/travel/notifications/preferences${q}`);
  },
  async updatePreferences(dto) { getCurrentUser(); return request('put', '/api/travel/notifications/preferences', dto); },
  async registerPushSubscription(dto) { getCurrentUser(); return request('post', '/api/travel/notifications/push-subscription', dto); },
  async unregisterPushSubscription(endpoint) { getCurrentUser(); return request('delete', `/api/travel/notifications/push-subscription?endpoint=${encodeURIComponent(endpoint)}`); },
  async checkNotifications(tripId) { getCurrentUser(); return request('post', `/api/travel/notifications/check?tripId=${tripId}`); },
  async checkDocumentNotifications(tripId) { getCurrentUser(); return request('post', `/api/travel/notifications/check-documents?tripId=${tripId}`); },
  async checkBudgetNotifications(tripId) { getCurrentUser(); return request('post', `/api/travel/notifications/check-budget?tripId=${tripId}`); },
  async checkItineraryNotifications(tripId) { getCurrentUser(); return request('post', `/api/travel/notifications/check-itinerary?tripId=${tripId}`); },
};
