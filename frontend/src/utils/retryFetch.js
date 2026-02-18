const RETRYABLE_STATUSES = [502, 503, 504]

/**
 * Determines if an error is caused by a cold-start (service spinning up).
 * Matches network failures and gateway errors typical of Render.com free tier.
 */
export function isColdStartError(error) {
  if (error?.isColdStart) return true
  if (error?.name === 'TypeError') return true
  const msg = error?.message || ''
  return msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')
}

/**
 * Wraps a fetch call with automatic retry and exponential backoff.
 * Designed to transparently handle Render.com free-tier cold starts (~60s spin-up).
 *
 * @param {() => Promise<Response>} fetchFn - Function that returns a fetch promise
 * @param {Object} options
 * @param {number} options.maxRetries - Maximum retry attempts (default 5 => ~44s total window)
 * @param {number} options.baseDelay - Initial delay in ms before first retry (default 2000)
 * @param {number} options.maxDelay - Cap on delay between retries in ms (default 15000)
 * @param {number[]} options.retryableStatuses - HTTP status codes that trigger a retry
 * @param {(attempt: number, delay: number) => void} options.onRetry - Called before each retry wait
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(fetchFn, {
  maxRetries = 5,
  baseDelay = 2000,
  maxDelay = 15000,
  retryableStatuses = RETRYABLE_STATUSES,
  onRetry = null,
} = {}) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn()

      if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
        lastError = { status: response.status, isColdStart: true, message: `HTTP ${response.status}` }
        // Fall through to retry logic below
      } else {
        return response
      }
    } catch (error) {
      lastError = error
    }

    const isRetryable = isColdStartError(lastError)
    if (!isRetryable || attempt === maxRetries) {
      throw lastError
    }

    const delay = Math.min(baseDelay * 2 ** attempt, maxDelay)
    if (onRetry) onRetry(attempt + 1, delay)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  throw lastError
}
