/**
 * Paire Home Service
 */

import { request } from '../../../shared/services/apiClient';

export const paireHomeService = {
  async getHome() { return request('get', '/api/paire-home'); },
  async getRooms() { return request('get', '/api/paire-home/rooms'); },
  async upgradeRoom(room) { return request('post', `/api/paire-home/upgrade/${encodeURIComponent(room)}`); },
  async getFurniture() { return request('get', '/api/paire-home/furniture'); },
  async equipFurniture(room, furnitureCode, equip) {
    return request('post', '/api/paire-home/furniture/equip', { room, furnitureCode, equip });
  },
  async setTheme(theme) { return request('post', '/api/paire-home/theme', { theme }); },
  async getCoupleHome() { return request('get', '/api/paire-home/couple'); },
};
