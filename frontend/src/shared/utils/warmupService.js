import { getBackendUrl } from './getBackendUrl'

let hasWarmedUp = false

/**
 * Fires non-blocking pings to backend /health endpoints to wake up
 * Render.com free-tier services proactively. Called once on app mount.
 * Failures are silently swallowed — the goal is simply to trigger spin-up.
 */
export function warmUpApis() {
  if (hasWarmedUp) return
  hasWarmedUp = true

  const backendUrl = getBackendUrl()

  const targets = [
    `${backendUrl}/health`,
    `${backendUrl}/api/system/warmup`,
  ]

  targets.forEach(url => {
    fetch(url, { method: 'GET', mode: 'cors' }).catch(() => {})
  })
}
