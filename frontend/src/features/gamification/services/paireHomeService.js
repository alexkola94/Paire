import { apiRequest } from '../../../shared/services/apiClient'

export const paireHomeService = {
  async getHome() {
    return await apiRequest('/api/paire-home')
  },
  async getRooms() {
    return await apiRequest('/api/paire-home/rooms')
  },
  async upgradeRoom(room) {
    return await apiRequest(`/api/paire-home/upgrade/${encodeURIComponent(room)}`, { method: 'POST' })
  },
  async getFurniture() {
    return await apiRequest('/api/paire-home/furniture')
  },
  async equipFurniture(room, furnitureCode, equip) {
    return await apiRequest('/api/paire-home/furniture/equip', {
      method: 'POST',
      body: JSON.stringify({ room, furnitureCode, equip })
    })
  },
  async setTheme(theme) {
    return await apiRequest('/api/paire-home/theme', {
      method: 'POST',
      body: JSON.stringify({ theme })
    })
  },
  async getCoupleHome() {
    return await apiRequest('/api/paire-home/couple')
  }
}
