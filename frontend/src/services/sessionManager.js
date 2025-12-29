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

    const currentUserId = this.getCurrentUserId()

    if (data.type === 'SESSION_INVALIDATED') {
      // Another tab logged in with the same user - invalidate this session
      if (data.userId && currentUserId && data.userId === currentUserId && this.hasSession()) {
        hasDispatchedInvalidation = true
        // TRUE: Preserve localStorage because it's now owned by the other tab
        this.clearSession(false, true)

        // Prevent auto-login on reload/redirect
        sessionStorage.setItem('auth_prevent_autologin', 'true')

        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Another tab logged in with the same user' }
        }))
      }
    } else if (data.type === 'SESSION_CREATED') {
      // Another tab created a session - check if it's the same user
      if (data.userId && currentUserId && data.userId === currentUserId && this.hasSession()) {
        // Same user logged in another tab - invalidate this session
        hasDispatchedInvalidation = true
        // TRUE: Preserve localStorage because it belongs to the new session
        this.clearSession(false, true)

        // Prevent auto-login on reload/redirect
        sessionStorage.setItem('auth_prevent_autologin', 'true')

        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Same user logged in another tab' }
        }))
      }
    } else if (data.type === 'LOGOUT') {
      // Another tab logged out - only clear if it's the SAME user
      if (this.hasSession()) {

        // CHECK: Are we using sessionStorage (isolated)?
        // If so, we should not be affected by logouts in other tabs
        if (sessionStorage.getItem(SESSION_TOKEN_KEY)) {
          console.log('🛡️ [SessionManager] Ignoring logout from another tab because we are using isolated sessionStorage')
          return
        }

        // If logout message has a userId, check if it matches ours
        if (data.userId && data.userId !== currentUserId) {
          console.log('Ignoring logout from different user:', data.userId)
          return
        }

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
        // CHECK: Are we using sessionStorage (isolated)?
        // If we are using sessionStorage, we are independent of the shared localStorage
        // used for "Remember Me" or cross-tab sync. We can ignore this change.
        if (sessionStorage.getItem(SESSION_TOKEN_KEY)) {
          console.log('🛡️ [SessionManager] Ignoring cross-tab user change because we are using isolated sessionStorage')
          return
        }

        console.log('🔄 [SessionManager] Different user detected, clearing local session only')
        // Different user logged in - clear this session WITHOUT broadcasting and WITHOUT clearing shared keys
        // because those keys now belong to the new user
        this.clearSession(false, true)

        // Prevent auto-login on reload/redirect by setting a flag in sessionStorage
        // This stops the tab from immediately picking up the new user from localStorage
        sessionStorage.setItem('auth_prevent_autologin', 'true')

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

    // Clear the auto-login prevention flag since we are establishing a valid session for this tab
    sessionStorage.removeItem('auth_prevent_autologin')

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

      // DO NOT clear localStorage here! 
      // This allows a persistent session (User A) to exist in localStorage
      // while this tab uses an isolated session (User B) in sessionStorage.
      // Since getters prioritize sessionStorage, this tab will see User B.
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

    // Dispatch local event for current tab (App.jsx listens to this)
    window.dispatchEvent(new CustomEvent('auth-storage-change'))
  },

  /**
   * Get session token (checks sessionStorage then localStorage)
   */
  getToken() {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY)
  },

  /**
   * Get refresh token (checks sessionStorage then localStorage)
   */
  getRefreshToken() {
    return sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY) || localStorage.getItem(SESSION_REFRESH_TOKEN_KEY)
  },

  /**
   * Get current user (checks sessionStorage then localStorage)
   */
  getCurrentUser() {
    const userJson = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(SESSION_USER_KEY)
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
   * @param {boolean} preserveLocalStorage - Whether to preserve localStorage keys (use when clearing due to conflict)
   */
  clearSession(broadcast = true, preserveLocalStorage = false) {
    // Prevent infinite loops
    if (isClearingSession) {
      return
    }

    // Capture user ID before clearing, to include in broadcast
    const userId = this.getCurrentUserId();

    isClearingSession = true

    try {
      // Check if we are clearing an isolated session
      const isIsolatedSession = !!sessionStorage.getItem(SESSION_TOKEN_KEY);

      // Always clear sessionStorage (local to this tab)
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_USER_KEY)

      // Only clear localStorage if:
      // 1. We are NOT preserving it (normal logout)
      // 2. AND the session we are clearing was NOT isolated (i.e. it was a localStorage session)
      // If we are logging out of an isolated session, we MUST NOT touch localStorage
      // because that belongs to a different "Remember Me" session.
      if (!preserveLocalStorage && !isIsolatedSession) {
        localStorage.removeItem(SESSION_TOKEN_KEY)
        localStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
        localStorage.removeItem(SESSION_USER_KEY)

        // Clear cross-tab tracking
        localStorage.removeItem(CROSS_TAB_USER_KEY)
        localStorage.removeItem(CROSS_TAB_SESSION_KEY)
      }

      // Broadcast logout to other tabs only if requested (not when triggered by broadcast)
      if (broadcast && broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'LOGOUT',
          userId: userId, // Include user ID so other tabs can filter
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

