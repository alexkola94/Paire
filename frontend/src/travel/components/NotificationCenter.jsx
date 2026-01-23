import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiSettings, FiX } from 'react-icons/fi'
import { useNotifications } from '../context/NotificationContext'
import { getNotificationIcon, getNotificationPriorityColor } from '../services/notificationService'
import './NotificationCenter.css'

/**
 * Notification Center Component
 * Dropdown panel showing recent notifications with actions
 */
function NotificationCenter({ isOpen, onClose, onOpenSettings }) {
  const { t } = useTranslation()
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  const containerRef = useRef(null)

  // Load notifications when opened
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleNotificationClick = useCallback((notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    // TODO: Navigate to related item based on referenceType/referenceId
  }, [markAsRead])

  const handleDelete = useCallback((e, notificationId) => {
    e.stopPropagation()
    deleteNotification(notificationId)
  }, [deleteNotification])

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('notifications.justNow', 'Just now')
    if (diffMins < 60) return t('notifications.minsAgo', '{{mins}}m ago', { mins: diffMins })
    if (diffHours < 24) return t('notifications.hoursAgo', '{{hours}}h ago', { hours: diffHours })
    if (diffDays < 7) return t('notifications.daysAgo', '{{days}}d ago', { days: diffDays })

    return date.toLocaleDateString()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="notification-center"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="notification-center-header">
            <div className="header-title">
              <FiBell />
              <h3>{t('notifications.title', 'Notifications')}</h3>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </div>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button
                  className="action-btn"
                  onClick={() => markAllAsRead()}
                  title={t('notifications.markAllRead', 'Mark all as read')}
                >
                  <FiCheckCircle />
                </button>
              )}
              {onOpenSettings && (
                <button
                  className="action-btn"
                  onClick={onOpenSettings}
                  title={t('notifications.settings', 'Settings')}
                >
                  <FiSettings />
                </button>
              )}
              <button
                className="action-btn close-btn"
                onClick={onClose}
                title={t('common.close', 'Close')}
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="notification-center-content">
            {loading && notifications.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner-small" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <FiBell className="empty-icon" />
                <p>{t('notifications.noNotifications', 'No notifications yet')}</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    whileHover={{ backgroundColor: 'var(--hover-bg)' }}
                  >
                    <div
                      className="notification-icon"
                      style={{ color: getNotificationPriorityColor(notification.priority) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-body">{notification.body}</div>
                      <div className="notification-meta">
                        <span className="notification-time">{formatTime(notification.createdAt)}</span>
                        {!notification.isRead && (
                          <span className="unread-dot" />
                        )}
                      </div>
                    </div>

                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          className="item-action-btn"
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.id) }}
                          title={t('notifications.markRead', 'Mark as read')}
                        >
                          <FiCheck />
                        </button>
                      )}
                      <button
                        className="item-action-btn delete-btn"
                        onClick={(e) => handleDelete(e, notification.id)}
                        title={t('notifications.delete', 'Delete')}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default NotificationCenter
