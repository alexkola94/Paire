import { useState, useCallback } from 'react'

/**
 * Custom hook to handle swipe gestures on mobile devices
 * Supports swipe left (negative delta) and swipe right (positive delta)
 * 
 * @param {Object} options Configuration options
 * @param {Function} options.onSwipeLeft Callback for left swipe (e.g., delete)
 * @param {Function} options.onSwipeRight Callback for right swipe (e.g., approve/pay)
 * @param {number} options.threshold Minimum distance in pixels to trigger swipe (default: 60)
 * @returns {Object} { handleTouchStart, handleTouchMove, handleTouchEnd, swipeState }
 */
const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  preventScroll = true
} = {}) => {
  // State to track swipe per item ID
  // Format: { [itemId]: { startX, startY, currentX, isSwiping } }
  const [swipeState, setSwipeState] = useState({})

  /**
   * Start tracking touch
   */
  const handleTouchStart = useCallback((itemId, e) => {
    // Only handle touch events
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return

    // Ignore if clicking interactive elements (buttons, inputs)
    if (e.target.closest('button, a, input, select, .no-swipe')) return

    const touch = e.touches[0]
    setSwipeState(prev => ({
      ...prev,
      [itemId]: {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isSwiping: false
      }
    }))
  }, [])

  /**
   * Track movement
   */
  const handleTouchMove = useCallback((itemId, e) => {
    const touch = e.touches[0]
    const state = swipeState[itemId]

    if (!state) return

    const deltaX = touch.clientX - state.startX
    const deltaY = Math.abs(touch.clientY - state.startY)
    const absDeltaX = Math.abs(deltaX)

    // Determine if horizontal movement dominates vertical
    // This prevents accidental swipes while scrolling locally
    const horizontalDominance = absDeltaX > deltaY * 1.5

    if (absDeltaX > 10 && horizontalDominance) {
      // If movement is horizontal enough, maybe lock scroll
      if (preventScroll && e.cancelable) {
        // Determine direction validity
        const isLeft = deltaX < 0
        const isRight = deltaX > 0

        // Only prevent default if we actually have a handler for this direction
        const hasHandler = (isLeft && onSwipeLeft) || (isRight && onSwipeRight)

        if (hasHandler) {
          if (absDeltaX > 30) {
            e.preventDefault() // Lock vertical scroll once committed
          }

          setSwipeState(prev => ({
            ...prev,
            [itemId]: {
              ...prev[itemId],
              currentX: touch.clientX,
              isSwiping: true
            }
          }))
        }
      }
    }
  }, [swipeState, onSwipeLeft, onSwipeRight, preventScroll])

  /**
   * End tracking and trigger callbacks
   */
  const handleTouchEnd = useCallback((itemId, e) => {
    const state = swipeState[itemId]
    if (!state) return

    // Calculate final delta (use changedTouches if available, otherwise fallback)
    const touch = e.changedTouches ? e.changedTouches[0] : null
    const endX = touch ? touch.clientX : state.currentX
    const deltaX = endX - state.startX
    const absDeltaX = Math.abs(deltaX)

    if (state.isSwiping && absDeltaX > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight(itemId)
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft(itemId)
      }
    }

    // Reset state for this item
    setSwipeState(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }, [swipeState, onSwipeLeft, onSwipeRight, threshold])

  /**
   * Get visual properties for an item (transform, style classes)
   */
  const getSwipeProps = (itemId) => {
    const state = swipeState[itemId]
    if (!state || !state.isSwiping) return {}

    const deltaX = state.currentX - state.startX

    // Limit max drag visual distance to avoid weirdness
    const maxDrag = 150
    const constrainedDelta = Math.max(Math.min(deltaX, maxDrag), -maxDrag)

    return {
      style: {
        transform: `translateX(${constrainedDelta}px)`,
        transition: 'none'
      },
      className: `swiping ${deltaX > 0 ? 'swipe-right' : 'swipe-left'}`,
      offset: deltaX
    }
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getSwipeProps,
    isSwiping: (itemId) => swipeState[itemId]?.isSwiping
  }
}

export default useSwipeGesture
