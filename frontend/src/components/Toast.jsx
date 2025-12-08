import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'
import './Toast.css'

/**
 * Toast Notification Component
 * Displays temporary success, error, or info messages
 */
function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      if (onClose) {
        onClose()
      }
    }, 300) // Match CSS transition duration
  }

  if (!isVisible) return null

  const icons = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    info: FiInfo,
    warning: FiAlertCircle
  }

  const IconComponent = icons[type] || FiInfo

  return (
    <div 
      className={`toast toast-${type} ${isExiting ? 'toast-exiting' : ''}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <IconComponent className="toast-icon" size={20} />
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label={t('common.close')}
      >
        <FiX size={18} />
      </button>
    </div>
  )
}

export default Toast
