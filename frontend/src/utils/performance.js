/**
 * Performance Utilities
 * Helper functions for optimizing app performance
 */

/**
 * Preload a route component for faster navigation
 * @param {Function} importFn - Dynamic import function
 */
export const preloadRoute = (importFn) => {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn()
    })
  } else {
    setTimeout(() => {
      importFn()
    }, 200)
  }
}

/**
 * Intersection Observer for lazy loading images
 * @param {HTMLElement} element - Element to observe
 * @param {Function} callback - Callback when element is visible
 * @param {Object} options - IntersectionObserver options
 */
export const observeElement = (element, callback, options = {}) => {
  if (!element || !('IntersectionObserver' in window)) {
    // Fallback: execute immediately if IntersectionObserver not supported
    callback()
    return null
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback()
        observer.unobserve(element)
      }
    })
  }, {
    rootMargin: '50px', // Start loading 50px before element is visible
    threshold: 0.01,
    ...options
  })

  observer.observe(element)
  return observer
}

/**
 * Debounce function for search inputs and filters
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for scroll events
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Check if device is on slow connection
 * @returns {boolean} True if connection is slow
 */
export const isSlowConnection = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    // Check for slow connection types
    return connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'
  }
  return false
}

/**
 * Prefetch resources for better performance
 * @param {string} url - URL to prefetch
 * @param {string} type - Resource type ('script', 'style', 'fetch')
 */
export const prefetchResource = (url, type = 'fetch') => {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = type
  link.href = url
  document.head.appendChild(link)
}

/**
 * Measure performance metrics
 * @param {string} name - Performance mark name
 * @returns {Function} Function to end measurement
 */
export const measurePerformance = (name) => {
  if ('performance' in window && 'mark' in window.performance) {
    performance.mark(`${name}-start`)
    return () => {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
      const measure = performance.getEntriesByName(name)[0]
      console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`)
    }
  }
  return () => {}
}

