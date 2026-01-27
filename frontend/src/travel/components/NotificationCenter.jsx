import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiSettings, FiX } from 'react-icons/fi'
import { useNotifications } from '../context/NotificationContext'
import { getNotificationIcon, getNotificationPriorityColor } from '../services/notificationService'
import useIsMobile from '../hooks/useIsMobile'
import './NotificationCenter.css'

function NotificationCenter({ isOpen, onClose, onOpenSettings }) {
    const { t } = useTranslation()
    const isMobile = useIsMobile()

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

    // Format time helper
    const formatTime = useCallback((dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return t('notifications.justNow', 'Just now')
        if (diffMins < 60) return t('notifications.minutesAgo', '{{count}}m ago', { count: diffMins })
        if (diffHours < 24) return t('notifications.hoursAgo', '{{count}}h ago', { count: diffHours })
        if (diffDays < 7) return t('notifications.daysAgo', '{{count}}d ago', { count: diffDays })
        return date.toLocaleDateString()
    }, [t])

    // Handle notification click
    const handleNotificationClick = useCallback((notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        // If notification has an action URL, navigate to it
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl
        }
    }, [markAsRead])

    // Handle delete
    const handleDelete = useCallback((e, notificationId) => {
        e.stopPropagation()
        deleteNotification(notificationId)
    }, [deleteNotification])

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    const panelContent = (
        <motion.div
            key="notification-panel"
            ref={containerRef}
            className={`notification-center ${isMobile ? 'mobile-portal' : ''}`}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: -10, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={isMobile ? {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                top: 'auto',
                width: '100%',
                maxHeight: '80vh',
                borderRadius: '20px 20px 0 0',
                margin: 0,
                zIndex: 9999,
                background: 'var(--modal-bg, #1e1e28)',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            } : {}}
        >
            {/* ... header ... */}
            <div className="notification-center-header">
                {/* ... content ... */}
                {/* Copy existing header content here, or keep it if I can wrap effectively */}
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
    )

    // For mobile, render portal with AnimatePresence inside
    if (isMobile) {
        return createPortal(
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            key="notification-backdrop"
                            className="notification-mobile-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                zIndex: 9998,
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        {panelContent}
                    </>
                )}
            </AnimatePresence>,
            document.body
        )
    }

    // Desktop: render inline with AnimatePresence
    return (
        <AnimatePresence>
            {isOpen && panelContent}
        </AnimatePresence>
    )
}

export default NotificationCenter
