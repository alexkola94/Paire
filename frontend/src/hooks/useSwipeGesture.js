import { useRef, useEffect, useState } from 'react'

/**
 * Custom hook for swipe gesture detection
 * Supports swipe down to close modals on mobile
 */
function useSwipeGesture(onSwipeDown, threshold = 100) {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragDistance, setDragDistance] = useState(0)
  const elementRef = useRef(null)

  // Minimum swipe distance to trigger action
  const minSwipeDistance = threshold

  /**
   * Handle touch start
   */
  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientY)
    setIsDragging(true)
    setDragDistance(0)
  }

  /**
   * Handle touch move
   */
  const onTouchMove = (e) => {
    if (!touchStart) return
    
    const currentY = e.targetTouches[0].clientY
    const distance = currentY - touchStart
    
    // Only allow downward swipes
    if (distance > 0) {
      setDragDistance(distance)
    }
  }

  /**
   * Handle touch end
   */
  const onTouchEnd = (e) => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isDownSwipe = distance > minSwipeDistance

    if (isDownSwipe && onSwipeDown) {
      onSwipeDown()
    }

    setIsDragging(false)
    setDragDistance(0)
    setTouchStart(null)
    setTouchEnd(null)
  }

  /**
   * Update touch end position
   */
  const onTouchEndPosition = (e) => {
    setTouchEnd(e.changedTouches[0].clientY)
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: true })
    element.addEventListener('touchend', onTouchEndPosition, { passive: true })
    element.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEndPosition)
      element.removeEventListener('touchend', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchStart, touchEnd])

  return {
    elementRef,
    isDragging,
    dragDistance,
    style: isDragging && dragDistance > 0
      ? {
          transform: `translateY(${Math.min(dragDistance, 200)}px)`,
          transition: dragDistance > minSwipeDistance ? 'transform 0.2s ease-out' : 'none',
          opacity: dragDistance > minSwipeDistance ? 0.8 : 1
        }
      : {}
  }
}

export default useSwipeGesture

