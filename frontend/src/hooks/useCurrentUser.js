import { useState, useEffect, useCallback } from 'react'
import { getStoredUser } from '../services/auth'

/**
 * Custom hook to get and subscribe to current user updates
 * This hook ensures components re-render when user data changes
 * (e.g., when 2FA is enabled/disabled)
 * 
 * @returns {Object} Current user object or null
 */
const useCurrentUser = () => {
  const [user, setUser] = useState(() => getStoredUser())

  // Handler for user updates
  const handleUserUpdate = useCallback((event) => {
    const updatedUser = event?.detail?.user || getStoredUser()
    setUser(updatedUser)
  }, [])

  // Handler for storage changes (auth-storage-change event)
  const handleStorageChange = useCallback(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    // Listen for user-updated event (optimistic updates)
    window.addEventListener('user-updated', handleUserUpdate)
    
    // Listen for auth-storage-change event (login/logout)
    window.addEventListener('auth-storage-change', handleStorageChange)
    
    // Listen for storage events (cross-tab updates)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('user-updated', handleUserUpdate)
      window.removeEventListener('auth-storage-change', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [handleUserUpdate, handleStorageChange])

  return user
}

export default useCurrentUser
