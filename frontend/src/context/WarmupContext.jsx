import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const WarmupContext = createContext(null)

/**
 * Tracks whether the app is currently retrying requests due to a cold-start.
 * Components (like WarmupOverlay) can subscribe via useWarmup() to show
 * a friendly loading state instead of raw errors.
 *
 * Listens for 'warmup-retry-started' / 'warmup-retry-ended' custom events
 * so plain JS modules (api.js, auth.js) can signal warm-up state.
 */
export function WarmupProvider({ children }) {
  const [isWarmingUp, setIsWarmingUp] = useState(false)
  const activeRetries = useRef(0)

  const notifyRetryStarted = useCallback(() => {
    activeRetries.current += 1
    setIsWarmingUp(true)
  }, [])

  const notifyRetryEnded = useCallback(() => {
    activeRetries.current = Math.max(0, activeRetries.current - 1)
    if (activeRetries.current === 0) {
      setIsWarmingUp(false)
    }
  }, [])

  useEffect(() => {
    const handleStarted = () => notifyRetryStarted()
    const handleEnded = () => notifyRetryEnded()

    window.addEventListener('warmup-retry-started', handleStarted)
    window.addEventListener('warmup-retry-ended', handleEnded)

    return () => {
      window.removeEventListener('warmup-retry-started', handleStarted)
      window.removeEventListener('warmup-retry-ended', handleEnded)
    }
  }, [notifyRetryStarted, notifyRetryEnded])

  return (
    <WarmupContext.Provider value={{ isWarmingUp, notifyRetryStarted, notifyRetryEnded }}>
      {children}
    </WarmupContext.Provider>
  )
}

export function useWarmup() {
  const ctx = useContext(WarmupContext)
  if (!ctx) {
    return { isWarmingUp: false, notifyRetryStarted: () => {}, notifyRetryEnded: () => {} }
  }
  return ctx
}

/**
 * Global event-based warmup signaling for use outside React tree (api.js / auth.js).
 * The WarmupProvider listens for these events internally; call these from plain JS modules.
 */
export function dispatchWarmupStarted() {
  window.dispatchEvent(new CustomEvent('warmup-retry-started'))
}

export function dispatchWarmupEnded() {
  window.dispatchEvent(new CustomEvent('warmup-retry-ended'))
}
