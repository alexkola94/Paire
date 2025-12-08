import { useEffect, useRef } from 'react'

/**
 * Custom hook for screen reader announcements
 * Creates a live region for accessibility announcements
 */
function useScreenReader() {
  const announcementRef = useRef(null)

  useEffect(() => {
    // Create live region if it doesn't exist
    let liveRegion = document.getElementById('screen-reader-announcements')
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'screen-reader-announcements'
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `
      document.body.appendChild(liveRegion)
    }

    announcementRef.current = liveRegion
  }, [])

  /**
   * Announce message to screen readers
   */
  const announce = (message, priority = 'polite') => {
    if (!announcementRef.current) return

    const liveRegion = announcementRef.current
    liveRegion.setAttribute('aria-live', priority)
    
    // Clear previous message
    liveRegion.textContent = ''
    
    // Set new message (using setTimeout to ensure it's announced)
    setTimeout(() => {
      liveRegion.textContent = message
    }, 100)

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = ''
    }, 1000)
  }

  return { announce }
}

export default useScreenReader

