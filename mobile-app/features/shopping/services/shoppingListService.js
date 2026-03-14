/**
 * Shopping List Service
 */

import { request } from '../../../shared/services/apiClient';

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
