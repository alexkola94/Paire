import { getToken } from '../../services/auth'
import { isTokenExpired } from '../../utils/tokenUtils'
import { sessionManager } from '../../services/sessionManager'
import { getBackendUrl as getBackendApiUrl } from '../../utils/getBackendUrl'
import db, {
  createTrip,
  createItineraryEvent,
  createPackingItem,
  createDocument,
  createTravelExpense,
  createTripCity,
  createPinnedPOI,
  createTravelNote
} from './travelDb'

/**
 * Travel API Service
 * Primary: Backend API
 * Fallback: IndexedDB for offline support
 */

// ========================================
// API Request Helper (matches api.js pattern)
// ========================================

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Check if a resource should be fetched from API
 * Returns true if:
 * 1. Online
 * 2. Cache is expired OR unused
 */
const shouldFetch = async (key) => {
  if (!navigator.onLine) return false

  try {
    const syncState = await db.resourceSyncState.get(key)
    if (!syncState) return true // Never fetched

    const now = Date.now()
    return (now - syncState.timestamp) > CACHE_TTL
  } catch (error) {
    console.warn('Error checking sync state:', error)
    return true // Fail safe: fetch if checking failed
  }
}

/**
 * Mark a resource as successfully fetched
 */
const markFetched = async (key) => {
  try {
    await db.resourceSyncState.put({
      key,
      timestamp: Date.now()
    })
  } catch (error) {
    console.warn('Error updating sync state:', error)
  }
}


/**
 * Clear sync state for a trip to force re-fetch
 * Clears specific trip resources or all resources for the trip if no type specified
 */
export const clearTripCache = async (tripId) => {
  try {
    // Find all keys starting with trip_{tripId}
    const keys = await db.resourceSyncState.where('key').startsWith(`trip_${tripId}`).primaryKeys()
    if (keys.length > 0) {
      await db.resourceSyncState.bulkDelete(keys)
    }
    // Also clear global trips list cache marker
    await db.resourceSyncState.delete('trips_all')
  } catch (error) {
    console.error('Error clearing trip cache:', error)
  }
}

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
    throw new Error('Session expired. Please log in again.') // i18n-ignore
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
      throw new Error('Session expired. Please log in again.') // i18n-ignore
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
          case 'tripCities':
            endpoint = `/api/travel/trips/${tripId}/cities`
            break
          case 'pinnedPOIs':
            endpoint = `/api/travel/trips/${tripId}/saved-places`
            break
          case 'travelNotes':
            endpoint = `/api/travel/trips/${tripId}/notes`
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

/**
 * Upload a travel-related file attachment for a given trip.
 * Used by itinerary events and travel documents to attach PDFs, images, etc.
 */
export const uploadTravelFile = async (tripId, file) => {
  if (!tripId || !file) return null

  const formData = new FormData()
  formData.append('file', file)

  // This will throw on error; callers should handle and show friendly UI.
  return apiRequest(`/api/travel/trips/${tripId}/upload`, {
    method: 'POST',
    body: formData
  })
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
      // Check if we should fetch from API
      const shouldFetchData = await shouldFetch('trips_all')

      // If we have local data and don't need to fetch, return local
      if (!shouldFetchData) {
        const cached = await db.trips.toArray()
        if (cached && cached.length > 0) return cached
      }

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
        await markFetched('trips_all')
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
      // Check cache first
      const shouldFetchData = await shouldFetch(`trip_${id}`)

      if (!shouldFetchData) {
        const cached = await db.trips.get(id)
        if (cached) return cached
      }

      const trip = await apiRequest(`/api/travel/trips/${id}`)
      // Update cache
      await db.trips.put({ ...trip, _synced: true })
      await markFetched(`trip_${id}`)
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
   * Handles both API and IndexedDB-only trips
   */
  async update(id, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    // Check if trip exists in IndexedDB
    const localTrip = await db.trips.get(id)

    // If trip only exists locally (not synced), just update IndexedDB
    if (localTrip && !localTrip._synced) {
      await db.trips.update(id, { ...updatedData, _synced: false })
      // Update sync queue if there's a pending create operation
      const pendingCreate = await db.syncQueue
        .where('entityType').equals('trips')
        .filter(item => item.operation === 'create' && (item.data?.id === id || item.data?.localId === id))
        .first()
      if (pendingCreate) {
        // Update the queued create operation with new data
        await db.syncQueue.update(pendingCreate.id, {
          data: { ...pendingCreate.data, ...updatedData }
        })
      }
      return await db.trips.get(id)
    }

    try {
      const updated = await apiRequest(`/api/travel/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.trips.update(id, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Offline: update IndexedDB and queue for sync
        await db.trips.update(id, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'trips', { id, ...updatedData })
        const trip = await db.trips.get(id)
        return trip
      } else if (error.message && error.message.includes('404')) {
        // Trip doesn't exist on server but exists locally
        // Update IndexedDB and mark as unsynced
        await db.trips.update(id, { ...updatedData, _synced: false })
        // Queue as create if it was never synced
        if (localTrip && !localTrip._synced) {
          await addToSyncQueue('create', 'trips', { ...localTrip, ...updatedData })
        } else {
          await addToSyncQueue('update', 'trips', { id, ...updatedData })
        }
        return await db.trips.get(id)
      }
      throw error
    }
  },

  /**
   * Delete a trip
   * Handles both API and IndexedDB-only trips
   */
  async delete(id) {
    // First, check if trip exists in IndexedDB
    const localTrip = await db.trips.get(id)

    // Delete from IndexedDB and related data regardless of API status
    // This ensures IndexedDB-only trips can be deleted
    const deleteFromLocal = async () => {
      await db.trips.delete(id)
      // Also delete related data
      await db.itineraryEvents.where('tripId').equals(id).delete()
      await db.packingItems.where('tripId').equals(id).delete()
      await db.documents.where('tripId').equals(id).delete()
      await db.travelExpenses.where('tripId').equals(id).delete()
      await db.tripCities.where('tripId').equals(id).delete()
    }

    // If trip only exists locally (not synced), just delete from IndexedDB
    if (localTrip && !localTrip._synced) {
      await deleteFromLocal()
      // Remove from sync queue if it was queued for creation
      await db.syncQueue.where('entityType').equals('trips')
        .filter(item => item.data?.id === id || item.data?.localId === id)
        .delete()
      return
    }

    // Try to delete from API if online
    try {
      await apiRequest(`/api/travel/trips/${id}`, { method: 'DELETE' })
      // Successfully deleted from API, now delete from IndexedDB
      await deleteFromLocal()
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Offline: delete from IndexedDB and queue for sync
        await deleteFromLocal()
        // Only add to sync queue if trip was synced (exists on server)
        if (localTrip?._synced) {
          await addToSyncQueue('delete', 'trips', { id })
        }
      } else {
        // API error (e.g., 404 - trip doesn't exist on server)
        // Still delete from IndexedDB if it exists locally
        if (localTrip) {
          await deleteFromLocal()
          // If it was a 404, the trip only existed locally, so no need to queue
          if (error.message && !error.message.includes('404')) {
            throw error
          }
        } else {
          // Trip doesn't exist in either place
          throw error
        }
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
      const cacheKey = `trip_${tripId}_events`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.itineraryEvents.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const events = await apiRequest(`/api/travel/trips/${tripId}/events`)
      await db.itineraryEvents.where('tripId').equals(tripId).delete()
      if (Array.isArray(events)) {
        await db.itineraryEvents.bulkAdd(events.map(e => ({ ...e, _synced: true })))
        await markFetched(cacheKey)
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
      const cacheKey = `trip_${tripId}_packing`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.packingItems.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const items = await apiRequest(`/api/travel/trips/${tripId}/packing`)
      await db.packingItems.where('tripId').equals(tripId).delete()
      if (Array.isArray(items)) {
        await db.packingItems.bulkAdd(items.map(i => ({ ...i, _synced: true })))
        await markFetched(cacheKey)
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
      const cacheKey = `trip_${tripId}_docs`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.documents.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const docs = await apiRequest(`/api/travel/trips/${tripId}/documents`)
      await db.documents.where('tripId').equals(tripId).delete()
      if (Array.isArray(docs)) {
        await db.documents.bulkAdd(docs.map(d => ({ ...d, _synced: true })))
        await markFetched(cacheKey)
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
      const cacheKey = `trip_${tripId}_expenses`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.travelExpenses.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const expenses = await apiRequest(`/api/travel/trips/${tripId}/expenses`)
      await db.travelExpenses.where('tripId').equals(tripId).delete()
      if (Array.isArray(expenses)) {
        await db.travelExpenses.bulkAdd(expenses.map(e => ({ ...e, _synced: true })))
        await markFetched(cacheKey)
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
// Travel Note Service
// ========================================

export const noteService = {
  async getByTrip(tripId) {
    try {
      const cacheKey = `trip_${tripId}_notes`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.travelNotes.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const notes = await apiRequest(`/api/travel/trips/${tripId}/notes`)
      await db.travelNotes.where('tripId').equals(tripId).delete()
      if (Array.isArray(notes)) {
        await db.travelNotes.bulkAdd(notes.map(n => ({ ...n, _synced: true })))
        await markFetched(cacheKey)
      }
      return notes
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.travelNotes.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, noteData) {
    const note = createTravelNote({ ...noteData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/notes`, {
        method: 'POST',
        body: JSON.stringify(note)
      })
      await db.travelNotes.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.travelNotes.add({ ...note, _synced: false })
        await addToSyncQueue('create', 'travelNotes', { ...note, localId })
        return { ...note, id: localId }
      }
      throw error
    }
  },

  async update(tripId, noteId, updates) {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }

    try {
      const updated = await apiRequest(`/api/travel/trips/${tripId}/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })
      await db.travelNotes.update(noteId, { ...updated, _synced: true })
      return updated
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await db.travelNotes.update(noteId, { ...updatedData, _synced: false })
        await addToSyncQueue('update', 'travelNotes', { id: noteId, tripId, ...updatedData })
        return await db.travelNotes.get(noteId)
      }
      throw error
    }
  },

  async delete(tripId, noteId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/notes/${noteId}`, { method: 'DELETE' })
      await db.travelNotes.delete(noteId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'travelNotes', { id: noteId, tripId })
        await db.travelNotes.delete(noteId)
      } else {
        throw error
      }
    }
  }
}

// ========================================
// Saved Place Service (Pinned POIs)
// ========================================

export const savedPlaceService = {
  async getByTrip(tripId) {
    try {
      const cacheKey = `trip_${tripId}_places`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.pinnedPOIs.where('tripId').equals(tripId).toArray()
        if (cached && cached.length > 0) return cached
      }

      const places = await apiRequest(`/api/travel/trips/${tripId}/saved-places`)
      // Clear local cache for this trip and replace with server data
      // Note: This might overwrite unsynced local changes if we're not careful,
      // but typical pattern here matches other services.
      // Better strategy: merge or only delete synced ones.
      // For now, following other services pattern which deletes by tripId then bulk adds.
      await db.pinnedPOIs.where('tripId').equals(tripId).delete()

      if (Array.isArray(places)) {
        await db.pinnedPOIs.bulkAdd(places.map(p => ({ ...p, _synced: true })))
        await markFetched(cacheKey)
      }
      return places
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        return await db.pinnedPOIs.where('tripId').equals(tripId).toArray()
      }
      throw error
    }
  },

  async create(tripId, placeData) {
    // Ensure tripId is set
    const place = createPinnedPOI({ ...placeData, tripId })

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/saved-places`, {
        method: 'POST',
        body: JSON.stringify(place)
      })
      await db.pinnedPOIs.add({ ...created, _synced: true })
      return created
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.pinnedPOIs.add({ ...place, _synced: false })
        await addToSyncQueue('create', 'pinnedPOIs', { ...place, localId })
        return { ...place, id: localId }
      }
      throw error
    }
  },

  async delete(tripId, placeId) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/saved-places/${placeId}`, { method: 'DELETE' })
      await db.pinnedPOIs.delete(placeId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'pinnedPOIs', { id: placeId, tripId })
        await db.pinnedPOIs.delete(placeId)
      } else {
        throw error
      }
    }
  },

  async isPinned(tripId, poiId) {
    try {
      // Check local DB (which should be synced)
      const existing = await db.pinnedPOIs
        .where('[tripId+poiId]')
        .equals([tripId, poiId])
        .first()
      return Boolean(existing)
    } catch (error) {
      // Fallback
      const pois = await db.pinnedPOIs.where('tripId').equals(tripId).toArray()
      return pois.some(p => p.poiId === poiId)
    }
  }
}

// ========================================
// Trip City Service
// ========================================

export const tripCityService = {
  /**
   * Get all cities for a trip, ordered by sequence
   */
  async getByTrip(tripId) {
    try {
      const cacheKey = `trip_${tripId}_cities`
      const shouldFetchData = await shouldFetch(cacheKey)

      if (!shouldFetchData) {
        const cached = await db.tripCities.where('tripId').equals(tripId).sortBy('order')
        if (cached && cached.length > 0) {
          return cached.map(c => ({
            ...c,
            order: c.order || 0
          }))
        }
      }

      const cities = await apiRequest(`/api/travel/trips/${tripId}/cities`)
      // Map backend 'orderIndex' to frontend 'order'
      const mappedCities = (cities || []).map(c => ({
        ...c,
        order: c.orderIndex || c.order || 0
      }))
      // Cache in IndexedDB - use bulkPut to handle existing records safely
      if (Array.isArray(mappedCities)) {
        await db.tripCities.where('tripId').equals(tripId).delete()
        const citiesToStore = mappedCities.map(c => ({ ...c, _synced: true }))
        // Use bulkPut instead of bulkAdd to handle cases where records might still exist
        await db.tripCities.bulkPut(citiesToStore)
        await markFetched(cacheKey)
      }
      return mappedCities
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Return cached cities
        const cached = await db.tripCities.where('tripId').equals(tripId).sortBy('order')
        return cached.map(c => ({
          ...c,
          order: c.order || 0
        }))
      }
      throw error
    }
  },

  /**
   * Create a new trip city
   */
  async create(tripId, cityData) {
    const city = createTripCity({ ...cityData, tripId })

    // Map frontend 'order' to backend 'orderIndex'
    const apiCity = {
      ...city,
      orderIndex: city.order,
      order: undefined // Remove order, backend uses orderIndex
    }
    delete apiCity.order

    try {
      const created = await apiRequest(`/api/travel/trips/${tripId}/cities`, {
        method: 'POST',
        body: JSON.stringify(apiCity)
      })
      // Map backend 'orderIndex' back to frontend 'order'
      const mappedCity = {
        ...created,
        order: created.orderIndex || created.order || 0
      }
      await db.tripCities.put({ ...mappedCity, _synced: true })
      return mappedCity
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        const localId = await db.tripCities.add({ ...city, _synced: false })
        await addToSyncQueue('create', 'tripCities', { ...city, localId, tripId })
        return { ...city, id: localId }
      }
      throw error
    }
  },

  /**
   * Update an existing trip city
   */
  async update(cityId, cityData) {
    const updatedData = { ...cityData, updatedAt: new Date().toISOString() }

    // Look up local city to get tripId for the correct API route
    const localCity = await db.tripCities.get(cityId)
    const tripId = updatedData.tripId || localCity?.tripId

    // Map frontend 'order' to backend 'orderIndex'
    const apiData = {
      ...updatedData,
      orderIndex: updatedData.order,
      order: undefined
    }
    delete apiData.order

    try {
      const url = tripId
        ? `/api/travel/trips/${tripId}/cities/${cityId}`
        : `/api/travel/trips/cities/${cityId}`

      const updated = await apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(apiData)
      })
      // Map backend response back to frontend format
      const mappedCity = {
        ...updated,
        order: updated.orderIndex || updated.order || 0
      }
      await db.tripCities.update(cityId, { ...mappedCity, _synced: true })
      return mappedCity
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Offline: update locally and queue for sync
        await db.tripCities.update(cityId, { ...updatedData, _synced: false })
        const city = await db.tripCities.get(cityId)
        await addToSyncQueue('update', 'tripCities', { id: cityId, ...updatedData, tripId: city?.tripId })
        return await db.tripCities.get(cityId)
      } else if (String(error.message || '').includes('404')) {
        // City missing on server: keep local data and mark as unsynced
        await db.tripCities.update(cityId, { ...updatedData, _synced: false })
        return await db.tripCities.get(cityId)
      }
      throw error
    }
  },

  /**
   * Delete a trip city
   */
  async delete(cityId) {
    // Look up local city to determine its tripId for the correct API route
    const city = await db.tripCities.get(cityId)
    const tripId = city?.tripId

    try {
      if (tripId) {
        await apiRequest(`/api/travel/trips/${tripId}/cities/${cityId}`, { method: 'DELETE' })
      } else {
        // Fallback to legacy route if tripId is missing
        await apiRequest(`/api/travel/trips/cities/${cityId}`, { method: 'DELETE' })
      }
      await db.tripCities.delete(cityId)
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        await addToSyncQueue('delete', 'tripCities', { id: cityId, tripId })
        await db.tripCities.delete(cityId)
      } else if (String(error.message || '').includes('404')) {
        // If server says it's gone, remove it locally and continue
        await db.tripCities.delete(cityId)
      } else {
        throw error
      }
    }
  },

  /**
   * Reorder cities for a trip
   * @param {string|number} tripId - Trip ID
   * @param {Array<string|number>} cityIds - Array of city IDs in new order
   */
  async reorder(tripId, cityIds) {
    try {
      await apiRequest(`/api/travel/trips/${tripId}/cities/reorder`, {
        method: 'POST',
        body: JSON.stringify(cityIds)
      })
      // Update local order
      for (let i = 0; i < cityIds.length; i++) {
        await db.tripCities.update(cityIds[i], { order: i, _synced: true })
      }
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Update local order
        for (let i = 0; i < cityIds.length; i++) {
          await db.tripCities.update(cityIds[i], { order: i, _synced: false })
        }
        await addToSyncQueue('update', 'tripCities', { tripId, reorder: cityIds })
      } else {
        throw error
      }
    }
  }
}

// ========================================
// Layout Preferences Service
// ========================================

export const layoutPreferencesService = {
  /**
   * Get layout preferences for a trip
   */
  async getByTrip(tripId) {
    try {
      const result = await apiRequest(`/api/travel/trips/${tripId}/layout`)
      return result
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Return defaults when offline
        return { tripId, layoutConfig: '{}', preset: null }
      }
      throw error
    }
  },

  /**
   * Update layout preferences for a trip
   */
  async update(tripId, layoutConfig, preset = null) {
    const payload = {
      layoutConfig: typeof layoutConfig === 'string' ? layoutConfig : JSON.stringify(layoutConfig),
      preset
    }

    try {
      const result = await apiRequest(`/api/travel/trips/${tripId}/layout`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      return result
    } catch (error) {
      if (error instanceof OfflineError || error.isOffline) {
        // Store in localStorage as fallback when offline
        localStorage.setItem(`trip_layout_${tripId}`, JSON.stringify(payload))
        return { tripId, ...payload }
      }
      throw error
    }
  },

  /**
   * Parse layout config from JSON string
   */
  parseConfig(layoutConfig) {
    if (!layoutConfig || layoutConfig === '{}') {
      return null
    }
    try {
      return typeof layoutConfig === 'string' ? JSON.parse(layoutConfig) : layoutConfig
    } catch {
      return null
    }
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
  tripCityService,
  layoutPreferencesService,
  geocodingService,
  processSyncQueue,
  clearTripCache
}
