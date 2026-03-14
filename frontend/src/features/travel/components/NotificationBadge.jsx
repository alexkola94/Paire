import { memo } from 'react'
import { FiBell } from 'react-icons/fi'
import { useNotifications } from '../context/NotificationContext'
import './NotificationBadge.css'

/**
 * Notification Badge Component
 * Shows bell icon with unread count badge
 */
const NotificationBadge = memo(function NotificationBadge({ onClick, className = '' }) {
  const { unreadCount } = useNotifications()

  return (
    <button
      className={`notification-badge ${className}`}
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <FiBell className="notification-icon" />
      {unreadCount > 0 && (
        <span className="notification-count">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
})

export default NotificationBadge
