import { getToken } from '../../services/auth'
import { isTokenExpired } from '../../utils/tokenUtils'
import { sessionManager } from '../../services/sessionManager'
import { getBackendUrl as getBackendApiUrl } from '../../utils/getBackendUrl'

/**
 * Travel Notification Service
 * Handles notification preferences, push subscriptions, and notification management
 */

// ========================================
// API Request Helper
// ========================================

const handleSessionExpiration = () => {
  sessionManager.clearSession()
  window.dispatchEvent(new CustomEvent('session-invalidated', {
    detail: { reason: 'Session expired' }
  }))
}

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

  const response = await fetch(fullUrl, { ...options, headers })

  if (response.status === 401) {
    handleSessionExpiration()
    throw new Error('Session expired. Please log in again.')
  }

  if (response.status === 204) {
    return null
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
}

// ========================================
// Notification Service
// ========================================

export const notificationService = {
  /**
   * Get all notifications for the user
   * @param {string} tripId - Optional trip ID filter
   * @param {boolean} unreadOnly - If true, only return unread notifications
   * @param {number} limit - Maximum number of notifications to return
   */
  async getNotifications(tripId = null, unreadOnly = false, limit = 50) {
    const params = new URLSearchParams()
    if (tripId) params.append('tripId', tripId)
    if (unreadOnly) params.append('unreadOnly', 'true')
    params.append('limit', limit.toString())

    return apiRequest(`/api/travel/notifications?${params.toString()}`)
  },

  /**
   * Get unread notification count
   * @param {string} tripId - Optional trip ID filter
   */
  async getUnreadCount(tripId = null) {
    const params = tripId ? `?tripId=${tripId}` : ''
    return apiRequest(`/api/travel/notifications/unread${params}`)
  },

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    return apiRequest(`/api/travel/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
  },

  /**
   * Mark all notifications as read
   * @param {string} tripId - Optional trip ID filter
   */
  async markAllAsRead(tripId = null) {
    const params = tripId ? `?tripId=${tripId}` : ''
    return apiRequest(`/api/travel/notifications/mark-all-read${params}`, {
      method: 'POST'
    })
  },

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   */
  async deleteNotification(notificationId) {
    return apiRequest(`/api/travel/notifications/${notificationId}`, {
      method: 'DELETE'
    })
  },

  /**
   * Get notification preferences
   * @param {string} tripId - Optional trip ID for trip-specific preferences
   */
  async getPreferences(tripId = null) {
    const params = tripId ? `?tripId=${tripId}` : ''
    return apiRequest(`/api/travel/notifications/preferences${params}`)
  },

  /**
   * Update notification preferences
   * @param {Object} preferences - Updated preferences
   */
  async updatePreferences(preferences) {
    return apiRequest('/api/travel/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  },

  /**
   * Register push subscription
   * @param {PushSubscription} subscription - Browser push subscription
   */
  async registerPushSubscription(subscription) {
    const subscriptionJson = subscription.toJSON()
    return apiRequest('/api/travel/notifications/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        p256dhKey: subscriptionJson.keys?.p256dh || '',
        authKey: subscriptionJson.keys?.auth || '',
        userAgent: navigator.userAgent
      })
    })
  },

  /**
   * Unregister push subscription
   * @param {string} endpoint - Push endpoint to remove
   */
  async unregisterPushSubscription(endpoint) {
    return apiRequest(`/api/travel/notifications/push-subscription?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE'
    })
  },

  /**
   * Manually trigger notification check for a trip
   * @param {string} tripId - Trip ID to check
   */
  async checkNotifications(tripId) {
    return apiRequest(`/api/travel/notifications/check?tripId=${tripId}`, {
      method: 'POST'
    })
  }
}

// ========================================
// Browser Push Notification Helpers
// ========================================

/**
 * Check if browser supports push notifications
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Get current push notification permission status
 * @returns {'granted' | 'denied' | 'default'}
 */
export const getPushPermission = () => {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

/**
 * Request push notification permission
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export const requestPushPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Subscribe to push notifications
 * Requires service worker to be registered first
 * @returns {Promise<PushSubscription | null>}
 */
export const subscribeToPush = async () => {
  try {
    if (!isPushSupported()) {
      console.warn('Push notifications not supported')
      return null
    }

    const permission = await requestPushPermission()
    if (permission !== 'granted') {
      return null
    }

    const registration = await navigator.serviceWorker.ready

    // Get VAPID public key from meta tag or environment
    const vapidPublicKey = document.querySelector('meta[name="vapid-public-key"]')?.content
      || import.meta.env.VITE_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured')
      return null
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })

    // Register with backend
    await notificationService.registerPushSubscription(subscription)

    return subscription
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unregister from backend first
      await notificationService.unregisterPushSubscription(subscription.endpoint)

      // Then unsubscribe locally
      await subscription.unsubscribe()
    }
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
  }
}

/**
 * Get current push subscription
 * @returns {Promise<PushSubscription | null>}
 */
export const getCurrentPushSubscription = async () => {
  try {
    if (!isPushSupported()) return null

    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (error) {
    console.error('Error getting push subscription:', error)
    return null
  }
}

/**
 * Show a local notification (not push, just browser notification)
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 */
export const showLocalNotification = async (title, options = {}) => {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    })

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    return notification
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Convert URL-safe base64 to Uint8Array
 * Used for VAPID key conversion
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 */
export const getNotificationIcon = (type) => {
  const icons = {
    DocumentExpired: '🚨',
    DocumentExpiring: '📄',
    BudgetExceeded: '💸',
    BudgetThreshold90: '⚠️',
    BudgetThreshold75: '💰',
    ItineraryReminder1Hour: '⏰',
    ItineraryReminder6Hours: '🕐',
    ItineraryReminder24Hours: '📅',
    FlightStatusChange: '✈️',
    HotelCheckIn: '🏨',
    HotelCheckOut: '🏨',
    PackingMilestone50: '🧳',
    PackingMilestone75: '🧳',
    PackingComplete: '✅',
    TripApproaching: '🗺️'
  }

  return icons[type] || '🔔'
}

/**
 * Get notification priority color
 * @param {string} priority - Notification priority
 */
export const getNotificationPriorityColor = (priority) => {
  const colors = {
    critical: '#ef4444', // red
    high: '#f97316', // orange
    medium: '#eab308', // yellow
    low: '#22c55e' // green
  }

  return colors[priority] || colors.medium
}

export default notificationService
