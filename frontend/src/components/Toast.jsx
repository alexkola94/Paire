import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'
import './Toast.css'

// Create Context
const ToastContext = createContext(null)

/**
 * Toast Hook
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Individual Toast Component
 */
export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const { t } = useTranslation()
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      if (onClose) onClose()
    }, 300) // Match CSS transition duration
  }, [onClose])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, handleClose])

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

/**
 * Toast Provider Component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const contextValue = {
    addToast,
    removeToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur)
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default Toast
