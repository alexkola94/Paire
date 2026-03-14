import { apiRequest } from '../../../shared/services/apiClient'

export const twoFactorService = {
  async setup() {
    return await apiRequest('/api/auth/2fa/setup', { method: 'POST' })
  },
  async enable(code) {
    return await apiRequest('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
  },
  async verify(email, code, tempToken, options = {}) {
    const payload = {
      email,
      code,
      tempToken,
      ...(typeof options.rememberMe !== 'undefined' ? { rememberMe: options.rememberMe } : {}),
      ...(options.deviceFingerprint ? { deviceFingerprint: options.deviceFingerprint } : {})
    }
    return await apiRequest('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  async verifyBackup(backupCode, tempToken, options = {}) {
    const payload = {
      backupCode,
      tempToken,
      ...(typeof options.rememberMe !== 'undefined' ? { rememberMe: options.rememberMe } : {}),
      ...(options.deviceFingerprint ? { deviceFingerprint: options.deviceFingerprint } : {})
    }
    return await apiRequest('/api/auth/2fa/verify-backup', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  async disable(password) {
    return await apiRequest('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  }
}
