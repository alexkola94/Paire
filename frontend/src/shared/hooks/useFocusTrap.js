import { useEffect, useRef } from 'react'

/**
 * Custom hook for focus trap in modals
 * Ensures keyboard navigation stays within the modal
 */
function useFocusTrap(isActive = true) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    /**
     * Handle Tab key navigation
     */
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: go to previous element
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: go to next element
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    /**
     * Focus first element when modal opens
     */
    if (firstElement) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        firstElement.focus()
      }, 100)
    }

    container.addEventListener('keydown', handleTabKey)

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [isActive])

  return containerRef
}

export default useFocusTrap

