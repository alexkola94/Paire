import Dexie from 'dexie'

/**
 * Travel Command Center IndexedDB Database
 * Uses Dexie.js for structured offline storage
 */
const db = new Dexie('TravelCommandCenter')

// Define database schema - Version 1
db.version(1).stores({
  // Trips table - supports single active trip, prepared for multiple trips
  // Indexes: id (auto), userId, status, startDate, endDate, destination, createdAt
  // _synced flag tracks if record is synced with backend
  trips: '++id, userId, status, startDate, endDate, destination, createdAt, _synced',

  // Itinerary events (flights, hotels, activities, transit, restaurants)
  // Compound index [tripId+date] for efficient date-based queries
  itineraryEvents: '++id, tripId, type, date, startTime, [tripId+date], _synced',

  // Packing items grouped by category
  // Compound index [tripId+category] for category-based queries
  packingItems: '++id, tripId, category, name, isChecked, [tripId+category], _synced',

  // Document metadata (passport, visas, bookings, insurance, tickets)
  // Compound index [tripId+type] for type-based filtering
  documents: '++id, tripId, type, name, expiryDate, [tripId+type], _synced',

  // Travel expenses with multi-currency support
  // Compound indexes for category and date-based queries
  travelExpenses: '++id, tripId, category, amount, currency, date, [tripId+category], [tripId+date], _synced',

  // Cached API responses (weather, flights, POI)
  // Used for offline-first strategy with TTL
  apiCache: '++id, key, data, timestamp, ttl',

  // Sync queue for offline operations
  // Stores pending CRUD operations to sync when back online
  syncQueue: '++id, action, table, timestamp, status'
})

// Version 2 - Add pinnedPOIs table for Discovery Mode
db.version(2).stores({
  trips: '++id, userId, status, startDate, endDate, destination, createdAt, _synced',
  itineraryEvents: '++id, tripId, type, date, startTime, [tripId+date], _synced',
  packingItems: '++id, tripId, category, name, isChecked, [tripId+category], _synced',
  documents: '++id, tripId, type, name, expiryDate, [tripId+type], _synced',
  travelExpenses: '++id, tripId, category, amount, currency, date, [tripId+category], [tripId+date], _synced',
  apiCache: '++id, key, data, timestamp, ttl',
  syncQueue: '++id, action, table, timestamp, status',

  // Pinned POIs from Discovery Mode - saved places for the trip
  // Indexes: id (auto), tripId, poiId (unique external identifier), category, createdAt
  pinnedPOIs: '++id, tripId, poiId, category, [tripId+category], createdAt'
})

/**
 * Trip model factory
 * @param {Object} data - Trip data
 * @returns {Object} Trip object with defaults
 */
export const createTrip = (data = {}) => ({
  userId: data.userId || null,
  name: data.name || '',
  destination: data.destination || '',
  country: data.country || '',
  latitude: data.latitude || null,
  longitude: data.longitude || null,
  startDate: data.startDate || null,
  endDate: data.endDate || null,
  budget: data.budget || 0,
  budgetCurrency: data.budgetCurrency || 'EUR',
  status: data.status || 'planning', // 'planning' | 'active' | 'completed'
  coverImage: data.coverImage || null,
  notes: data.notes || '',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Itinerary event model factory
 * @param {Object} data - Event data
 * @returns {Object} Itinerary event object with defaults
 */
export const createItineraryEvent = (data = {}) => ({
  tripId: data.tripId,
  type: data.type || 'activity', // 'flight' | 'hotel' | 'activity' | 'transit' | 'restaurant' | 'other'
  name: data.name || '',
  date: data.date || null,
  startTime: data.startTime || null,
  endTime: data.endTime || null,
  location: data.location || '',
  address: data.address || '',
  latitude: data.latitude || null,
  longitude: data.longitude || null,
  confirmationNumber: data.confirmationNumber || '',
  notes: data.notes || '',
  // Optional attachment metadata for supporting event documents (e.g. tickets, PDFs)
  // These are kept generic so the backend can evolve without breaking offline data.
  attachmentUrl: data.attachmentUrl || null,
  attachmentName: data.attachmentName || '',
  attachmentType: data.attachmentType || '',
  attachmentSize: data.attachmentSize || null,
  // Flight-specific
  flightNumber: data.flightNumber || '',
  airline: data.airline || '',
  departureAirport: data.departureAirport || '',
  arrivalAirport: data.arrivalAirport || '',
  // Hotel-specific
  checkInTime: data.checkInTime || '',
  checkOutTime: data.checkOutTime || '',
  roomType: data.roomType || '',
  // Status
  status: data.status || 'confirmed', // 'confirmed' | 'pending' | 'cancelled'
  reminderMinutes: data.reminderMinutes || null,
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Packing item model factory
 * @param {Object} data - Packing item data
 * @returns {Object} Packing item object with defaults
 */
export const createPackingItem = (data = {}) => ({
  tripId: data.tripId,
  category: data.category || 'other', // 'clothing' | 'toiletries' | 'electronics' | 'documents' | 'medications' | 'other'
  name: data.name || '',
  quantity: data.quantity || 1,
  isChecked: data.isChecked || false,
  isEssential: data.isEssential || false,
  notes: data.notes || '',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Document model factory
 * @param {Object} data - Document data
 * @returns {Object} Document object with defaults
 */
export const createDocument = (data = {}) => ({
  tripId: data.tripId,
  type: data.type || 'other', // 'passport' | 'visa' | 'booking' | 'insurance' | 'ticket' | 'other'
  name: data.name || '',
  documentNumber: data.documentNumber || '',
  expiryDate: data.expiryDate || null,
  issueDate: data.issueDate || null,
  issuingCountry: data.issuingCountry || '',
  fileUrl: data.fileUrl || null,
  fileThumbnail: data.fileThumbnail || null,
  notes: data.notes || '',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Travel expense model factory
 * @param {Object} data - Expense data
 * @returns {Object} Travel expense object with defaults
 */
export const createTravelExpense = (data = {}) => ({
  tripId: data.tripId,
  category: data.category || 'other', // 'accommodation' | 'transport' | 'food' | 'activities' | 'shopping' | 'other'
  amount: data.amount || 0,
  currency: data.currency || 'EUR',
  amountInBaseCurrency: data.amountInBaseCurrency || data.amount || 0,
  exchangeRate: data.exchangeRate || 1,
  description: data.description || '',
  date: data.date || new Date().toISOString().split('T')[0],
  paymentMethod: data.paymentMethod || '',
  receiptUrl: data.receiptUrl || null,
  notes: data.notes || '',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * API cache entry model factory
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Object} Cache entry object
 */
export const createCacheEntry = (key, data, ttl = 30 * 60 * 1000) => ({
  key,
  data,
  timestamp: Date.now(),
  ttl
})

/**
 * Check if cache entry is valid
 * @param {Object} entry - Cache entry
 * @returns {boolean} True if cache is still valid
 */
export const isCacheValid = (entry) => {
  if (!entry || !entry.timestamp || !entry.ttl) return false
  return (Date.now() - entry.timestamp) < entry.ttl
}

/**
 * Get cached data by key
 * @param {string} key - Cache key
 * @returns {Promise<*|null>} Cached data or null if expired/not found
 */
export const getCached = async (key) => {
  try {
    const entry = await db.apiCache.where('key').equals(key).first()
    if (entry && isCacheValid(entry)) {
      return entry.data
    }
    // Clean up expired entry
    if (entry) {
      await db.apiCache.delete(entry.id)
    }
    return null
  } catch (error) {
    console.error('Error getting cached data:', error)
    return null
  }
}

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const setCached = async (key, data, ttl = 30 * 60 * 1000) => {
  try {
    // Remove existing entry with same key
    await db.apiCache.where('key').equals(key).delete()
    // Add new entry
    await db.apiCache.add(createCacheEntry(key, data, ttl))
  } catch (error) {
    console.error('Error setting cached data:', error)
  }
}

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = async () => {
  try {
    const now = Date.now()
    const entries = await db.apiCache.toArray()
    const expiredIds = entries
      .filter(entry => (now - entry.timestamp) >= entry.ttl)
      .map(entry => entry.id)

    if (expiredIds.length > 0) {
      await db.apiCache.bulkDelete(expiredIds)
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
}

/**
 * Pinned POI model factory
 * @param {Object} data - POI data from discovery
 * @returns {Object} Pinned POI object with defaults
 */
export const createPinnedPOI = (data = {}) => ({
  tripId: data.tripId,
  poiId: data.poiId || data.id || '', // External POI identifier
  name: data.name || '',
  category: data.category || 'other',
  latitude: data.latitude || data.lat || null,
  longitude: data.longitude || data.lon || null,
  address: data.address || '',
  phone: data.phone || '',
  website: data.website || '',
  openingHours: data.openingHours || '',
  rating: data.rating || null,
  notes: data.notes || '',
  source: data.source || 'overpass', // 'overpass' | 'mapbox' | 'manual'
  createdAt: data.createdAt || new Date().toISOString()
})

/**
 * Get pinned POIs for a trip
 * @param {number|string} tripId - Trip ID
 * @returns {Promise<Array>} Array of pinned POIs
 */
export const getPinnedPOIs = async (tripId) => {
  try {
    return await db.pinnedPOIs.where('tripId').equals(tripId).toArray()
  } catch (error) {
    console.error('Error getting pinned POIs:', error)
    return []
  }
}

/**
 * Add a pinned POI
 * @param {Object} poi - POI data
 * @returns {Promise<number>} New POI ID
 */
export const addPinnedPOI = async (poi) => {
  try {
    const pinnedPOI = createPinnedPOI(poi)
    return await db.pinnedPOIs.add(pinnedPOI)
  } catch (error) {
    console.error('Error adding pinned POI:', error)
    throw error
  }
}

/**
 * Remove a pinned POI
 * @param {number} id - Pinned POI ID
 */
export const removePinnedPOI = async (id) => {
  try {
    await db.pinnedPOIs.delete(id)
  } catch (error) {
    console.error('Error removing pinned POI:', error)
    throw error
  }
}

/**
 * Check if a POI is already pinned
 * @param {number|string} tripId - Trip ID
 * @param {string} poiId - External POI ID
 * @returns {Promise<boolean>} True if pinned
 */
export const isPOIPinned = async (tripId, poiId) => {
  try {
    const existing = await db.pinnedPOIs
      .where('[tripId+poiId]')
      .equals([tripId, poiId])
      .first()
    return Boolean(existing)
  } catch (error) {
    // Fallback if compound index doesn't work
    const pois = await db.pinnedPOIs.where('tripId').equals(tripId).toArray()
    return pois.some(p => p.poiId === poiId)
  }
}

export default db
