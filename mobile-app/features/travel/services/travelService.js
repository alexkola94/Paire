/**
 * Travel Trips (CRUD) Service
 */

import { request, getCurrentUser } from '../../../shared/services/apiClient';

export const travelService = {
  async getTrips() { getCurrentUser(); return request('get', '/api/travel/trips'); },
  async getTrip(id) { getCurrentUser(); return request('get', `/api/travel/trips/${id}`); },
  async createTrip(trip) { getCurrentUser(); return request('post', '/api/travel/trips', trip); },
  async updateTrip(id, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${id}`, updates); },
  async deleteTrip(id) { getCurrentUser(); await request('delete', `/api/travel/trips/${id}`); },
  async getExpenses(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/expenses`); },
  async createExpense(tripId, expense) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/expenses`, expense); },
  async updateExpense(tripId, expenseId, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${tripId}/expenses/${expenseId}`, updates); },
  async deleteExpense(tripId, expenseId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/expenses/${expenseId}`); },
  async getEvents(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/events`); },
  async createEvent(tripId, evt) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/events`, evt); },
  async updateEvent(tripId, eventId, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${tripId}/events/${eventId}`, updates); },
  async deleteEvent(tripId, eventId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/events/${eventId}`); },
  async getPackingItems(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/packing`); },
  async createPackingItem(tripId, item) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/packing`, item); },
  async updatePackingItem(tripId, itemId, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${tripId}/packing/${itemId}`, updates); },
  async deletePackingItem(tripId, itemId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/packing/${itemId}`); },
  async getDocuments(tripId) { getCurrentUser(); return request('get', `/api/travel/trips/${tripId}/documents`); },
  async createDocument(tripId, doc) { getCurrentUser(); return request('post', `/api/travel/trips/${tripId}/documents`, doc); },
  async updateDocument(tripId, docId, updates) { getCurrentUser(); return request('put', `/api/travel/trips/${tripId}/documents/${docId}`, updates); },
  async deleteDocument(tripId, docId) { getCurrentUser(); await request('delete', `/api/travel/trips/${tripId}/documents/${docId}`); },
};
