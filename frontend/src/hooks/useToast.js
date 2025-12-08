import { useState, useCallback } from 'react'

/**
 * Custom hook for managing toast notifications
 */
function useToast() {
  const [toasts, setToasts] = useState([])

  /**
   * Add a new toast
   */
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    const newToast = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])
    
    return id
  }, [])

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  /**
   * Clear all toasts
   */
  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  /**
   * Convenience methods
   */
  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration)
  }, [addToast])

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration)
  }, [addToast])

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration)
  }, [addToast])

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration)
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}

export default useToast

