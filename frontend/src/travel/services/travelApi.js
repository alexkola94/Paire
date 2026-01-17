import { getToken } from '../../services/auth'
import { isTokenExpired } from '../../utils/tokenUtils'
import { sessionManager } from '../../services/sessionManager'
import { getBackendUrl as getBackendApiUrl } from '../../utils/getBackendUrl'
import db, {
  createTrip,
  createItineraryEvent,
  createPackingItem,
  createDocument,
  createTravelExpense
} from './travelDb'

/**
 * Travel API Service
 * Primary: Backend API
 * Fallback: IndexedDB for offline support
 */

// ========================================
// API Request Helper (matches api.js pattern)
// ========================================

const handleSessionExpiration = () => {
  sessionManager.clearSession()
  window.dispatchEvent(new CustomEvent('session-invalidated', {
    detail: { reason: 'Session expired' }
  }))
}

/**
 * Make authenticated API request to backend
 * Falls back to IndexedDB operations when offline
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken()

  if (token && isTokenExpired(token)) {
    handleSessionExpiration()
    throw new Error('Session expired. Please log in again.')
  }

  let backendApiUrl = getBackendApiUrl()

  if (typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname
    const currentProtocol = window.location.protocol

    if (currentHostname &&
      currentHostname !== 'localhost' &&
      currentHostname !== '127.0.0.1' &&
      backendApiUrl.includes('localhost')) {
      backendApiUrl = `${currentProtocol}//${currentHostname}:5038`
    }
  }

  backendApiUrl = backendApiUrl.replace(/\/+$/, '')
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  const fullUrl = `${backendApiUrl}${normalizedUrl}`

  const headers = { ...options.headers }

  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(fullUrl, { ...options, headers })

    if (response.status === 401) {
      handleSessionExpiration()
      throw new Error('Session expired. Please log in again.')
    }

    if (options.method === 'DELETE' && response.status === 204) {
      return
    }

    if (!response.ok) {
      const errorData = await response.text().catch(() => '')
      throw new Error(errorData || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    return await response.text()
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      // Network error - mark as offline operation
      throw new OfflineError(`Cannot connect to API. Operating in offline mode.`)
    }
    throw error
  }
}

// Custom error class for offline detection
class OfflineError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OfflineError'
    this.isOffline = true
  }
}

// ========================================
// Sync Queue Operations
// ========================================

/**
 * Add operation to sync queue for later execution
 */
const addToSyncQueue = async (action, table, data) => {
  try {
    await db.syncQueue.add({
      action, // 'create' | 'update' | 'delete'
      table,
      data,
      timestamp: Date.now(),
      status: 'pending'
    })
  } catch (error) {
    console.error('Error adding to sync queue:', error)
  }
}

/**
 * Process pending sync queue items
 * Syncs offline-created items to server and updates local IDs
 */
export const processSyncQueue = async () => {
  try {
    const pendingItems = await db.syncQueue
      .where('status').equals('pending')
      .sortBy('timestamp') // Process in order of creation

    // Map to track local ID -> server ID mappings for trips
    const tripIdMapping = new Map()

    for (const item of pendingItems) {
      try {
        let endpoint = ''
        let method = 'POST'
        let tripId = item.data.tripId

        // If this item references a locally-created trip, use the mapped server ID
        if (tripId && tripIdMapping.has(tripId)) {
          tripId = tripIdMapping.get(tripId)
        }

        switch (item.table) {
          case 'trips':
            endpoint = '/api/travel/trips'
            break
          case 'itineraryEvents':
            endpoint = `/api/travel/trips/${tripId}/events`
            break
          case 'packingItems':
            endpoint = `/api/travel/trips/${tripId}/packing`
            break
          case 'documents':
            endpoint = `/api/travel/trips/${tripId}/documents`
            break
          case 'travelExpenses':
            endpoint = `/api/travel/trips/${tripId}/expenses`
            break
          default:
            continue
        }

        if (item.action === 'update') {
          method = 'PUT'
          endpoint += `/${item.data.id}`
        } else if (item.action === 'delete') {
          method = 'DELETE'
          endpoint += `/${item.data.id}`
        }

        // Prepare data - exclude local-only fields
        const syncData = { ...item.data }
        delete syncData.localId
        delete syncData._synced
        if (tripId !== item.data.tripId) {
          syncData.tripId = tripId // Use mapped server ID
        }

        const result = await apiRequest(endpoint, {
          method,
          body: item.action !== 'delete' ? JSON.stringify(syncData) : undefined
        })

        // For creates, update local DB with server ID and track mapping
        if (item.action === 'create' && result?.id) {
          const localId = item.data.localId || item.data.id

          if (item.table === 'trips') {
            // Map local trip ID to server ID
            tripIdMapping.set(localId, result.id)
            // Update local record with server data
            await db.trips.delete(localId)
            await db.trips.put({ ...result, _synced: true })
            // Update activeTripId in localStorage if needed
            if (localStorage.getItem('activeTripId') == localId) {
              localStorage.setItem('activeTripId', result.id)
            }
          } else {
            // Update child entities
            const table = db[item.table]
            if (table) {
              await table.delete(localId)
              await table.put({ ...result, _synced: true })
            }
          }
        }

        // Mark as synced
        await db.syncQueue.update(item.id, { status: 'synced' })
      } catch (error) {
        if (error instanceof OfflineError) {
          // Still offline, stop processing
          break
        }
        console.error(`Sync error for ${item.table}:`, error)
        // Mark as failed
        await db.syncQueue.update(item.id, {
          status: 'failed',
          error: error.message
        })
      }
    }

    // Clean up synced items
    await db.syncQueue.where('status').equals('synced').delete()
  } catch (error) {
    console.error('Error processing sync queue:', error)
  }
}

// ========================================
// Trip Service
// ========================================

export const tripService = {
  /**
   * Get all trips for current user
   */
  async getAll() {
    try {
      const trips = await apiRequest('/api/travel/trips')
      // Cache in IndexedDB - use bulkPut instead of clear+bulkAdd to preserve existing trips
      if (Array.isArray(trips)) {
        // Get existing trips from IndexedDB to preserve any unsynced local trips
        const existingTrips = await db.trips.toArray()
        const existingTripIds = new Set(existingTrips.map(t => t.id))
        
        // Remove trips from IndexedDB that are no longer in the server response
        // (but only if they're synced - don't delete unsynced local trips)
        const serverTripIds = new Set(trips.map(t => t.id))
        const tripsToDelete = existingTrips.filter(t => 
          t._synced && !serverTripIds.has(t.id)
        )
        if (tripsToDelete.length > 0) {
          await db.trips.bulkDelete(tripsToDelete.map(t => t.id))
        }
        
        // Add or update trips from server
        const tripsToStore = trips.map(t => ({ ...t, _synced: true }))
        await db.trips.bulkPut(tripsToStore)
      }
      return trips
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Return cached trips
        return await db.trips.toArray()
      }
      throw error
    }
  },

  /**
   * Get single trip by ID
   */
  async getById(id) {
    try {
      const trip = await apiRequest(`/api/travel/trips/${id}`)
      // Update cache
      await db.trips.put({ ...trip, _synced: true })
      return trip
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.trips.get(id)
      }
      throw error
    }
  },

  /**
   * Create a new trip
   */
  async create(tripData) {
    const trip = createTrip(tripData)

    try {
      const created = await apiRequest('/api/travel/trips', {
        method: 'POST',
        body: JSON.stringify(trip)
      })
      // Cache with server ID using put() to handle existing keys
      await db.trips.put({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Save locally with temp ID
        const localId = await db.trips.add({ ...trip, _synced: false })
        await addToSyncQueue('create', 'trips', { ...trip, localId })
        return { ...trip, id: localId }
      }
      throw error
    }
  },

  /**
   * Update an existing trip
   */
  async update(id, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.trips.update(id, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.trips.update(id, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'trips', { id, ...updatedData })
        const trip = await db.trips.get(id)
        return trip
      }
      throw error
    }
  },

  /**
   * Delete a trip
   */
  async delete(id) {
    try {
      await apiRequest(`/api/travel/trips/${id}`, { method: 'DELETE' })
      await db.trips.delete(id)
      // Also delete related data
      await db.itineraryEvents.where('tripId').equals(id).delete()
      await db.packingItems.where('tripId').equals(id).delete()
      await db.documents.where('tripId').equals(id).delete()
      await db.travelExpenses.where('tripId').equals(id).delete()
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'trips', { id })
        await db.trips.delete(id)
      } else {
        throw error
      }
    }
  }
}

// ========================================
// Itinerary Event Service
// ========================================

export const itineraryService = {
  async getByTrip(tripId) {
    try {
      const events = await apiRequest(`/api/travel/trips/${tripId}/events`)
      await db.itineraryEvents.where('tripId').equals(tripId).delete()
      if (Array.isArray(events)) {
        await db.itineraryEvents.bulkAdd(events.map(e => ({ ...e, _synced: true })))
      }
      return events
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.itineraryEvents.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, eventData) {
    const event = createItineraryEvent({ ...eventData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/events`, {
        method: 'POST',
        body: JSON.stringify(event)
      })
      await db.itineraryEvents.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.itineraryEvents.add({ ...event, _synced: false })
        await addToSyncQueue('create', 'itineraryEvents', { ...event, localId })
        return { ...event, id: localId }
      }
      throw error
    }
  },

  async update(tripId, eventId, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${tripId}/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.itineraryEvents.update(eventId, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.itineraryEvents.update(eventId, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'itineraryEvents', { id: eventId, tripId, ...updatedData })
        return await db.itineraryEvents.get(eventId)
      }
      throw error
    }
  },

  async delete(tripId, eventId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/events/${eventId}`, { method: 'DELETE' })
      await db.itineraryEvents.delete(eventId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'itineraryEvents', { id: eventId, tripId })
        await db.itineraryEvents.delete(eventId)
      } else {
        throw error
      }
    }
  }
}

// ========================================
// Packing Item Service
// ========================================

export const packingService = {
  async getByTrip(tripId) {
    try {
      const items = await apiRequest(`/api/travel/trips/${tripId}/packing`)
      await db.packingItems.where('tripId').equals(tripId).delete()
      if (Array.isArray(items)) {
        await db.packingItems.bulkAdd(items.map(i => ({ ...i, _synced: true })))
      }
      return items
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.packingItems.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, itemData) {
    const item = createPackingItem({ ...itemData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/packing`, {
        method: 'POST',
        body: JSON.stringify(item)
      })
      await db.packingItems.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.packingItems.add({ ...item, _synced: false })
        await addToSyncQueue('create', 'packingItems', { ...item, localId })
        return { ...item, id: localId }
      }
      throw error
    }
  },

  async update(tripId, itemId, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${tripId}/packing/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.packingItems.update(itemId, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.packingItems.update(itemId, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'packingItems', { id: itemId, tripId, ...updatedData })
        return await db.packingItems.get(itemId)
      }
      throw error
    }
  },

  async toggleChecked(tripId, itemId, isChecked) {
    return this.update(tripId, itemId, { isChecked })
  },

  async delete(tripId, itemId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/packing/${itemId}`, { method: 'DELETE' })
      await db.packingItems.delete(itemId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'packingItems', { id: itemId, tripId })
        await db.packingItems.delete(itemId)
      } else {
        throw error
      }
    }
  },

  async bulkCreate(tripId, items) {
    const createdItems = []
    for (const itemData of items) {
      const created = await this.create(tripId, itemData)
      createdItems.push(created)
    }
    return createdItems
  }
}

// ========================================
// Document Service
// ========================================

export const documentService = {
  async getByTrip(tripId) {
    try {
      const docs = await apiRequest(`/api/travel/trips/${tripId}/documents`)
      await db.documents.where('tripId').equals(tripId).delete()
      if (Array.isArray(docs)) {
        await db.documents.bulkAdd(docs.map(d => ({ ...d, _synced: true })))
      }
      return docs
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.documents.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, docData) {
    const doc = createDocument({ ...docData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/documents`, {
        method: 'POST',
        body: JSON.stringify(doc)
      })
      await db.documents.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.documents.add({ ...doc, _synced: false })
        await addToSyncQueue('create', 'documents', { ...doc, localId })
        return { ...doc, id: localId }
      }
      throw error
    }
  },

  async update(tripId, docId, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${tripId}/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.documents.update(docId, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.documents.update(docId, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'documents', { id: docId, tripId, ...updatedData })
        return await db.documents.get(docId)
      }
      throw error
    }
  },

  async delete(tripId, docId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/documents/${docId}`, { method: 'DELETE' })
      await db.documents.delete(docId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'documents', { id: docId, tripId })
        await db.documents.delete(docId)
      } else {
        throw error
      }
    }
  }
}

// ========================================
// Travel Expense Service
// ========================================

export const travelExpenseService = {
  async getByTrip(tripId) {
    try {
      const expenses = await apiRequest(`/api/travel/trips/${tripId}/expenses`)
      await db.travelExpenses.where('tripId').equals(tripId).delete()
      if (Array.isArray(expenses)) {
        await db.travelExpenses.bulkAdd(expenses.map(e => ({ ...e, _synced: true })))
      }
      return expenses
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.travelExpenses.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, expenseData) {
    const expense = createTravelExpense({ ...expenseData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expense)
      })
      await db.travelExpenses.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.travelExpenses.add({ ...expense, _synced: false })
        await addToSyncQueue('create', 'travelExpenses', { ...expense, localId })
        return { ...expense, id: localId }
      }
      throw error
    }
  },

  async update(tripId, expenseId, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${tripId}/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.travelExpenses.update(expenseId, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.travelExpenses.update(expenseId, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'travelExpenses', { id: expenseId, tripId, ...updatedData })
        return await db.travelExpenses.get(expenseId)
      }
      throw error
    }
  },

  async delete(tripId, expenseId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' })
      await db.travelExpenses.delete(expenseId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'travelExpenses', { id: expenseId, tripId })
        await db.travelExpenses.delete(expenseId)
      } else {
        throw error
      }
    }
  },

  async getSummary(tripId) {
    const expenses = await this.getByTrip(tripId)
    const summary = {
      total: 0,
      byCategory: {},
      count: expenses.length
    }

    expenses.forEach(expense => {
      summary.total += expense.amountInBaseCurrency || expense.amount
      if (!summary.byCategory[expense.category]) {
        summary.byCategory[expense.category] = 0
      }
      summary.byCategory[expense.category] += expense.amountInBaseCurrency || expense.amount
    })

    return summary
  }
}

// ========================================
// Geocoding Service
// ========================================

export const geocodingService = {
  /**
   * Search for locations using backend geocoding endpoint
   * Proxies Nominatim requests to avoid CORS issues, especially on mobile
   */
  async search(query, limit = 5) {
    if (!query || query.length < 3) return []

    try {
      const results = await apiRequest(`/api/travel/geocode?q=${encodeURIComponent(query)}&limit=${limit}`)
      return results || []
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Return empty array when offline - geocoding requires online connection
        console.warn('Geocoding unavailable offline')
        return []
      }
      console.error('Geocoding error:', error)
      return []
    }
  }
}

export default {
  tripService,
  itineraryService,
  packingService,
  documentService,
  travelExpenseService,
  geocodingService,
  processSyncQueue
}
