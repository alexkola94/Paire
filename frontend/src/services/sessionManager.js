/**
 * Session Manager Service
 * Handles per-tab session management and cross-tab communication
 * Uses sessionStorage for per-tab sessions and BroadcastChannel for cross-tab communication
 */

// Session storage keys (per-tab, cleared when tab closes)
const SESSION_TOKEN_KEY = 'session_auth_token'
const SESSION_REFRESH_TOKEN_KEY = 'session_refresh_token'
const SESSION_USER_KEY = 'session_user'
const SESSION_TAB_ID_KEY = 'session_tab_id'

// LocalStorage keys (for cross-tab communication only)
const CROSS_TAB_USER_KEY = 'cross_tab_user_id'
const CROSS_TAB_SESSION_KEY = 'cross_tab_session_id'

// BroadcastChannel for cross-tab communication
let broadcastChannel = null
// Flag to prevent infinite loops when clearing session
let isClearingSession = false
// Flag to prevent multiple event dispatches
let hasDispatchedInvalidation = false

/**
 * Initialize BroadcastChannel for cross-tab communication
 */
const initBroadcastChannel = () => {
  if (typeof BroadcastChannel !== 'undefined' && !broadcastChannel) {
    broadcastChannel = new BroadcastChannel('auth_session_channel')
  }
  return broadcastChannel
}

/**
 * Get unique tab ID
 */
const getTabId = () => {
  let tabId = sessionStorage.getItem(SESSION_TAB_ID_KEY)
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_TAB_ID_KEY, tabId)
  }
  return tabId
}

/**
 * Session Manager
 */
export const sessionManager = {
  /**
   * Initialize session manager
   */
  init() {
    initBroadcastChannel()
    getTabId()

    // Listen for cross-tab messages
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data)
      }
    }

    // Listen for storage events (fallback for browsers without BroadcastChannel)
    window.addEventListener('storage', (e) => {
      this.handleStorageEvent(e)
    })
  },

  /**
   * Handle broadcast messages from other tabs
   */
  handleBroadcastMessage(data) {
    // Ignore messages from the same tab to prevent loops
    if (data.tabId === getTabId()) {
      return
    }

    // Prevent re-entry if already clearing session or already dispatched
    if (isClearingSession || hasDispatchedInvalidation) {
      return
    }

    if (data.type === 'SESSION_INVALIDATED') {
      // Another tab logged in with the same user - invalidate this session
      const currentUserId = this.getCurrentUserId()
      if (data.userId && data.userId === currentUserId && this.hasSession()) {
        hasDispatchedInvalidation = true
        this.clearSession(false) // Don't broadcast - already handled
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Another tab logged in with the same user' }
        }))
      }
    } else if (data.type === 'SESSION_CREATED') {
      // Another tab created a session - check if it's the same user
      const currentUserId = this.getCurrentUserId()
      if (data.userId && currentUserId && data.userId === currentUserId && this.hasSession()) {
        // Same user logged in another tab - invalidate this session
        hasDispatchedInvalidation = true
        this.clearSession(false) // Don't broadcast - already handled
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Same user logged in another tab' }
        }))
      }
    } else if (data.type === 'LOGOUT') {
      // Another tab logged out - only clear if we have a session
      if (this.hasSession()) {
        hasDispatchedInvalidation = true
        this.clearSession(false) // Don't broadcast - already handled
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Logged out from another tab' }
        }))
      }
    }
  },

  /**
   * Handle storage events (fallback)
   */
  handleStorageEvent(e) {
    if (e.key === CROSS_TAB_SESSION_KEY) {
      // Session changed in another tab
      const currentUserId = this.getCurrentUserId()
      const newUserId = localStorage.getItem(CROSS_TAB_USER_KEY)

      if (currentUserId && newUserId && currentUserId !== newUserId) {
        // Different user logged in - clear this session
        this.clearSession()
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Different user logged in another tab' }
        }))
      }
    }
  },

  /**
   * Store session data (per-tab or persistent)
   * @param {string} token - Auth token
   * @param {string} refreshToken - Refresh token
   * @param {Object} user - User object
   * @param {boolean} rememberMe - Whether to persist session across browser restarts
   */
  storeSession(token, refreshToken, user, rememberMe = false) {
    // Reset invalidation flag when storing new session
    hasDispatchedInvalidation = false

    if (rememberMe) {
      // Store in localStorage (persistent)
      localStorage.setItem(SESSION_TOKEN_KEY, token)
      localStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))

      // Clear sessionStorage to avoid duplicates/confusion
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_USER_KEY)
    } else {
      // Store in sessionStorage (per-tab)
      sessionStorage.setItem(SESSION_TOKEN_KEY, token)
      sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken)
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))

      // Clear localStorage to avoid duplicates/confusion
      localStorage.removeItem(SESSION_TOKEN_KEY)
      localStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
      localStorage.removeItem(SESSION_USER_KEY)
    }

    // Store user ID in localStorage for cross-tab communication (always needed)
    localStorage.setItem(CROSS_TAB_USER_KEY, user.id)
    localStorage.setItem(CROSS_TAB_SESSION_KEY, `${user.id}_${Date.now()}`)

    // Broadcast session creation to other tabs
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'SESSION_CREATED',
        userId: user.id,
        tabId: getTabId()
      })
    }
  },

  /**
   * Get session token (checks localStorage then sessionStorage)
   */
  getToken() {
    return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
  },

  /**
   * Get refresh token (checks localStorage then sessionStorage)
   */
  getRefreshToken() {
    return localStorage.getItem(SESSION_REFRESH_TOKEN_KEY) || sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)
  },

  /**
   * Get current user (checks localStorage then sessionStorage)
   */
  getCurrentUser() {
    const userJson = localStorage.getItem(SESSION_USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY)
    return userJson ? JSON.parse(userJson) : null
  },

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    const user = this.getCurrentUser()
    return user?.id || null
  },

  /**
   * Check if session exists
   */
  hasSession() {
    return !!this.getToken() && !!this.getCurrentUser()
  },

  /**
   * Clear session (both storages)
   * @param {boolean} broadcast - Whether to broadcast the logout to other tabs (default: true)
   */
  clearSession(broadcast = true) {
    // Prevent infinite loops
    if (isClearingSession) {
      return
    }

    isClearingSession = true

    try {
      // Clear both storages
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_USER_KEY)

      localStorage.removeItem(SESSION_TOKEN_KEY)
      localStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
      localStorage.removeItem(SESSION_USER_KEY)

      // Clear cross-tab tracking
      localStorage.removeItem(CROSS_TAB_USER_KEY)
      localStorage.removeItem(CROSS_TAB_SESSION_KEY)

      // Broadcast logout to other tabs only if requested (not when triggered by broadcast)
      if (broadcast && broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'LOGOUT',
          tabId: getTabId()
        })
      }
    } finally {
      // Reset flags after a short delay to allow cleanup
      setTimeout(() => {
        isClearingSession = false
      }, 100)
    }
  },

  /**
   * Broadcast session invalidation (when same user logs in)
   */
  broadcastSessionInvalidation(userId) {
    if (broadcastChannel && userId) {
      broadcastChannel.postMessage({
        type: 'SESSION_INVALIDATED',
        userId: userId,
        tabId: getTabId()
      })
    }
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  sessionManager.init()
}

