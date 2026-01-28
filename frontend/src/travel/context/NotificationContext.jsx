import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  notificationService,
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  subscribeToPush,
  getCurrentPushSubscription,
  showLocalNotification
} from '../services/notificationService'
import { useToast } from '../../hooks/useToast'

const NotificationContext = createContext()

/**
 * Notification Provider
 * Manages travel notification state, preferences, push subscriptions, and unread counts
 */
export const NotificationProvider = ({ children }) => {
  const { t } = useTranslation()
  // Notifications state
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Preferences state
  const [preferences, setPreferences] = useState(null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)

  // Push subscription state
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState('default')
  const [pushSubscription, setPushSubscription] = useState(null)

  // Current trip context (optional filter)
  const [currentTripId, setCurrentTripId] = useState(null)

  // Polling interval ref
  const pollingIntervalRef = useRef(null)

  const { addToast } = useToast()

  // Check push support on mount
  useEffect(() => {
    setPushSupported(isPushSupported())
    setPushPermission(getPushPermission())

    // Check for existing subscription
    getCurrentPushSubscription().then(sub => {
      setPushSubscription(sub)
    })
  }, [])

  /**
   * Load notifications from API
   */
  const loadNotifications = useCallback(async (tripId = null, unreadOnly = false, limit = 50) => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications(tripId || currentTripId, unreadOnly, limit)
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [currentTripId])

  /**
   * Load unread count
   */
  const loadUnreadCount = useCallback(async (tripId = null) => {
    try {
      const data = await notificationService.getUnreadCount(tripId || currentTripId)
      setUnreadCount(data?.count || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }, [currentTripId])

  /**
   * Load notification preferences
   */
  const loadPreferences = useCallback(async (tripId = null) => {
    try {
      setPreferencesLoading(true)
      const data = await notificationService.getPreferences(tripId || currentTripId)
      setPreferences(data)
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setPreferencesLoading(false)
    }
  }, [currentTripId])

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      setPreferencesLoading(true)
      const updated = await notificationService.updatePreferences(newPreferences)
      setPreferences(updated)
      addToast(t('travel.notifications.toast.preferencesUpdated', 'Notification preferences updated'), 'success')
      return updated
    } catch (error) {
      console.error('Error updating preferences:', error)
      addToast(t('travel.notifications.toast.failedToUpdatePreferences', 'Failed to update preferences'), 'error')
      throw error
    } finally {
      setPreferencesLoading(false)
    }
  }, [addToast, t])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId)

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (tripId = null) => {
    try {
      await notificationService.markAllAsRead(tripId || currentTripId)

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [currentTripId])

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId)

      // Find the notification to check if it was unread
      const notification = notifications.find(n => n.id === notificationId)
      const wasUnread = notification && !notification.isRead

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [notifications])

  /**
   * Request push notification permission and subscribe
   */
  const enablePushNotifications = useCallback(async () => {
    try {
      const permission = await requestPushPermission()
      setPushPermission(permission)

      if (permission === 'granted') {
        const subscription = await subscribeToPush()
        setPushSubscription(subscription)

        if (subscription) {
          addToast(t('travel.notifications.toast.pushEnabled', 'Push notifications enabled'), 'success')
        } else {
          addToast(t('travel.notifications.toast.pushCouldNotEnable', 'Could not enable push notifications'), 'warning')
        }

        return subscription
      } else {
        addToast(t('travel.notifications.toast.pushPermissionDenied', 'Push notification permission denied'), 'warning')
        return null
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error)
      addToast(t('travel.notifications.toast.pushFailed', 'Failed to enable push notifications'), 'error')
      return null
    }
  }, [addToast, t])

  /**
   * Show local notification (browser notification)
   */
  const showNotification = useCallback(async (title, body, options = {}) => {
    return showLocalNotification(title, { body, ...options })
  }, [])

  /**
   * Manually trigger notification check for current trip
   */
  const checkNotifications = useCallback(async (tripId) => {
    try {
      const result = await notificationService.checkNotifications(tripId || currentTripId)
      if (result?.notificationsSent > 0) {
        // Reload notifications after check
        await loadNotifications(tripId)
        await loadUnreadCount(tripId)
      }
      return result
    } catch (error) {
      console.error('Error checking notifications:', error)
      throw error
    }
  }, [currentTripId, loadNotifications, loadUnreadCount])

  /**
   * Set the current trip context for filtering
   */
  const setTripContext = useCallback((tripId) => {
    setCurrentTripId(tripId)
  }, [])

  // Start polling for unread count when mounted
  useEffect(() => {
    // Initial load
    loadUnreadCount()

    // Poll every 5 minutes
    pollingIntervalRef.current = setInterval(() => {
      loadUnreadCount()
    }, 5 * 60 * 1000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [loadUnreadCount])

  // Reload when trip context changes
  useEffect(() => {
    if (currentTripId) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [currentTripId, loadNotifications, loadUnreadCount])

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    preferences,
    preferencesLoading,
    pushSupported,
    pushPermission,
    pushSubscription,
    currentTripId,

    // Actions
    loadNotifications,
    loadUnreadCount,
    loadPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    enablePushNotifications,
    showNotification,
    checkNotifications,
    setTripContext
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Hook to use notification context
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext
