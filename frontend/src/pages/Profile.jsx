import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUser, FiMail, FiGlobe, FiLock, FiCamera, FiSave, FiTrash2, FiAlertTriangle, FiPower, FiCreditCard, FiCalendar } from 'react-icons/fi'
import { authService } from '../services/auth'
import { profileService } from '../services/api'
import { getBackendUrl } from '../utils/getBackendUrl'
import TwoFactorSetup from '../components/TwoFactorSetup'
import LogoLoader from '../components/LogoLoader'
import './Profile.css'

/**
 * Profile Page Component
 * User settings and preferences
 */
function Profile() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '',
    avatar_url: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [clearDataConfirmation, setClearDataConfirmation] = useState('')
  const [clearingData, setClearingData] = useState(false)
  const [clearDataRequest, setClearDataRequest] = useState(null)

  /**
   * Load user data on mount
   */
  useEffect(() => {
    loadUser()
  }, [])

  /**
   * Fetch current user and profile
   */
  const loadUser = async () => {
    try {
      setLoading(true)
      const userData = await authService.getUser()
      setUser(userData)

      // Load user profile
      const profileData = await profileService.getProfile(userData.id)
      setProfile(profileData)

      if (profileData) {
        setProfileData({
          display_name: profileData.display_name || '',
          avatar_url: profileData.avatar_url || ''
        })
        setAvatarPreview(profileData.avatar_url || null)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle avatar file selection
   */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * Save profile changes
   */
  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      let avatarUrl = profileData.avatar_url

      // Upload avatar if changed
      if (avatarFile) {
        avatarUrl = await profileService.uploadAvatar(avatarFile, user.id)
      }

      // Update profile - use endpoint without ID (uses authenticated user from JWT)
      console.log('Updating profile with data:', {
        display_name: profileData.display_name,
        avatar_url: avatarUrl
      })

      await profileService.updateMyProfile({
        display_name: profileData.display_name,
        avatar_url: avatarUrl
      })

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditingProfile(false)
      setAvatarFile(null)

      // Reload profile
      await loadUser()
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle language change
   * Supports English (en) and Greek (el)
   */
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    setMessage({ type: 'success', text: 'Language updated successfully!' })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  /**
   * Handle password change
   */
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      await authService.updatePassword(passwordData.currentPassword, passwordData.newPassword)
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setShowPasswordForm(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' })
    }
  }

  /**
   * Handle cancel password form
   */
  const handleCancelPasswordForm = () => {
    setShowPasswordForm(false)
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  /**
   * Check for existing data clearing request on mount
   */
  useEffect(() => {
    if (user?.id) {
      checkClearDataStatus()
    }
  }, [user?.id])

  /**
   * Check status of data clearing request
   */
  const checkClearDataStatus = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/dataclearing/status?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.hasActiveRequest) {
          setClearDataRequest(data)
        }
      }
    } catch (error) {
      console.error('Error checking clear data status:', error)
    }
  }

  /**
   * Handle initiating data clearing request
   */
  const handleClearAllData = async () => {
    if (clearDataConfirmation !== 'DELETE ALL MY DATA') {
      setMessage({ type: 'error', text: t('profile.clearData.invalidConfirmation') })
      return
    }

    try {
      setClearingData(true)
      const response = await fetch(`${getBackendUrl()}/api/dataclearing/initiate?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmationPhrase: 'DELETE ALL MY DATA',
          notes: 'User initiated data clearing from profile'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initiate data clearing')
      }

      const result = await response.json()

      if (result.requiresPartnerApproval) {
        setMessage({
          type: 'info',
          text: t('profile.clearData.partnerConfirmationSent')
        })
        setClearDataRequest(result)
      } else {
        setMessage({
          type: 'success',
          text: t('profile.clearData.success')
        })
        // Log out user after clearing data
        setTimeout(() => {
          authService.signOut()
        }, 2000)
      }

      setShowClearDataModal(false)
      setClearDataConfirmation('')
    } catch (error) {
      console.error('Error clearing data:', error)
      setMessage({ type: 'error', text: error.message || t('profile.clearData.error') })
    } finally {
      setClearingData(false)
    }
  }

  /**
   * Cancel pending data clearing request
   */
  const handleCancelClearDataRequest = async () => {
    try {
      const response = await fetch(
        `${getBackendUrl()}/api/dataclearing/cancel?userId=${user.id}&requestId=${clearDataRequest.requestId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setMessage({ type: 'success', text: t('profile.clearData.requestCancelled') })
        setClearDataRequest(null)
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      setMessage({ type: 'error', text: 'Failed to cancel request' })
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="profile-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>{t('profile.title')}</h1>
        <p className="page-subtitle">{t('profile.settings')}</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Personal Information */}
      <div className="card">
        <div className="card-header">
          <h2>{t('profile.personalInfo')}</h2>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="btn btn-secondary"
            >
              {t('common.edit')}
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="profile-edit-form">
            {/* Avatar Upload */}
            <div className="avatar-upload-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    <FiUser size={48} />
                  </div>
                )}
              </div>
              <div className="avatar-upload-controls">
                <label htmlFor="avatar-upload" className="btn btn-secondary">
                  <FiCamera size={18} />
                  {t('profile.changeAvatar')}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="form-group">
              <label htmlFor="display_name">
                {t('profile.displayName')}
              </label>
              <input
                type="text"
                id="display_name"
                value={profileData.display_name}
                onChange={(e) => setProfileData({
                  ...profileData,
                  display_name: e.target.value
                })}
                placeholder={t('profile.displayNamePlaceholder')}
              />
              <small className="form-hint">
                {t('profile.displayNameHint')}
              </small>
            </div>

            {/* Email (read-only) */}
            <div className="form-group">
              <label>{t('profile.emailAddress')}</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="input-disabled"
              />
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setEditingProfile(false)
                  setAvatarFile(null)
                  setAvatarPreview(profile?.avatar_url || null)
                  setProfileData({
                    display_name: profile?.display_name || '',
                    avatar_url: profile?.avatar_url || ''
                  })
                }}
                className="btn btn-secondary"
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="btn btn-primary"
                disabled={saving}
              >
                <FiSave size={18} />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            {/* Avatar Display */}
            <div className="profile-avatar-display">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name || 'Avatar'} />
              ) : (
                <div className="avatar-placeholder">
                  <FiUser size={48} />
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="info-item">
              <div className="info-icon">
                <FiUser size={20} />
              </div>
              <div className="info-content">
                <label>{t('profile.displayName')}</label>
                <p>{profile?.display_name || t('profile.noDisplayName')}</p>
              </div>
            </div>

            {/* Email */}
            <div className="info-item">
              <div className="info-icon">
                <FiMail size={20} />
              </div>
              <div className="info-content">
                <label>{t('profile.emailAddress')}</label>
                <p>{user?.email}</p>
              </div>
            </div>

            {/* User ID */}
            <div className="info-item">
              <div className="info-icon">
                <FiUser size={20} />
              </div>
              <div className="info-content">
                <label>User ID</label>
                <p className="user-id">{user?.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language Settings */}
      <div className="card">
        <div className="card-header">
          <h2>
            <FiGlobe size={24} />
            {t('profile.language')}
          </h2>
        </div>

        <div className="language-options">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`}
          >
            <span className="flag">🇺🇸</span>
            <span>English</span>
          </button>
          <button
            onClick={() => handleLanguageChange('el')}
            className={`language-btn ${i18n.language === 'el' ? 'active' : ''}`}
          >
            <span className="flag">🇬🇷</span>
            <span>Ελληνικά</span>
          </button>
        </div>
      </div>

      {/* Password Settings */}
      <div className="card">
        <div className="card-header">
          <h2>
            <FiLock size={24} />
            {t('profile.changePassword')}
          </h2>
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="btn btn-secondary"
          >
            {t('profile.changePassword')}
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value
                })}
                placeholder={t('auth.currentPasswordPlaceholder')}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">
                {t('auth.password')}
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value
                })}
                placeholder={t('auth.newPasswordPlaceholder')}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value
                })}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancelPasswordForm}
                className="btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('common.save')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup
        isEnabled={user?.twoFactorEnabled || false}
        onStatusChange={async (enabled) => {
          // Reload user data from API to get the latest 2FA status
          // Force refresh to bypass localStorage cache
          try {
            const updatedUser = await authService.getUser(true)
            setUser(updatedUser)
            setMessage({
              type: 'success',
              text: enabled
                ? 'Two-factor authentication enabled successfully!'
                : 'Two-factor authentication disabled successfully!'
            })
          } catch (error) {
            console.error('Error refreshing user data:', error)
            // Fallback: update local state if API call fails
            setUser(prev => ({ ...prev, twoFactorEnabled: enabled }))
            setMessage({
              type: 'success',
              text: enabled
                ? 'Two-factor authentication enabled successfully!'
                : 'Two-factor authentication disabled successfully!'
            })
          }
        }}
      />

      {/* Open Banking Integration */}
      <div className="card">
        <div className="card-header">
          <h2>
            <FiGlobe size={24} />
            {t('profile.openBanking.title', 'Bank Connections')}
          </h2>
        </div>

        <BankConnections />
      </div>

      {/* Danger Zone - Clear All Data */}
      <div className="card danger-zone">
        <div className="card-header">
          <h2>
            <FiAlertTriangle size={24} />
            {t('profile.clearData.dangerZone')}
          </h2>
        </div>

        <div className="danger-zone-content">
          {clearDataRequest && clearDataRequest.status === 'pending' ? (
            <div className="pending-request-info">
              <FiAlertTriangle size={24} className="warning-icon" />
              <div>
                <h3>{t('profile.clearData.pendingRequest')}</h3>
                <p>{t('profile.clearData.pendingDescription')}</p>
                <p className="expiry-time">
                  {t('profile.clearData.expiresAt')}: {new Date(clearDataRequest.expiresAt).toLocaleString()}
                </p>
                <button
                  onClick={handleCancelClearDataRequest}
                  className="btn btn-secondary btn-sm"
                >
                  {t('profile.clearData.cancelRequest')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="danger-warning">
                <FiAlertTriangle />
                <div>
                  <h3>{t('profile.clearData.warning')}</h3>
                  <p>{t('profile.clearData.warningDescription')}</p>
                  <ul>
                    <li>{t('profile.clearData.deleteTransactions')}</li>
                    <li>{t('profile.clearData.deleteLoans')}</li>
                    <li>{t('profile.clearData.deleteBudgets')}</li>
                    <li>{t('profile.clearData.deleteGoals')}</li>
                    <li>{t('profile.clearData.deletePartnership')}</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowClearDataModal(true)}
                className="btn btn-danger"
              >
                <FiTrash2 size={18} />
                {t('profile.clearData.buttonText')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="modal-overlay" onClick={() => !clearingData && setShowClearDataModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FiAlertTriangle size={24} className="text-danger" />
                {t('profile.clearData.confirmTitle')}
              </h2>
            </div>

            <div className="modal-body">
              <div className="warning-box">
                <FiAlertTriangle size={32} />
                <p>{t('profile.clearData.confirmWarning')}</p>
              </div>

              <p>{t('profile.clearData.confirmInstructions')}</p>

              <div className="form-group">
                <label>{t('profile.clearData.typeToConfirm')}:</label>
                <input
                  type="text"
                  value={clearDataConfirmation}
                  onChange={(e) => setClearDataConfirmation(e.target.value)}
                  placeholder={t('profile.clearData.exactPhrase')}
                  className="confirmation-input"
                  disabled={clearingData}
                  autoFocus
                />
                <small className="form-hint">{t('profile.clearData.exactPhrase')}</small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowClearDataModal(false)
                  setClearDataConfirmation('')
                }}
                className="btn btn-secondary"
                disabled={clearingData}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearAllData}
                className="btn btn-danger"
                disabled={clearingData || clearDataConfirmation !== 'DELETE ALL MY DATA'}
              >
                {clearingData ? (
                  <>
                    <div className="spinner-small"></div>
                    {t('profile.clearData.clearing')}
                  </>
                ) : (
                  <>
                    <FiTrash2 size={18} />
                    {t('profile.clearData.confirmButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BankConnections() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [banks, setBanks] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [country, setCountry] = useState('FI')
  const [connectionMessage, setConnectionMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadAccounts()
    loadBanks()
  }, [country])

  /**
   * Listen for messages from bank callback popup
   */
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify message is from same origin
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'BANK_CONNECTION_SUCCESS') {
        // Connection successful - reload accounts
        setLoading(false)
        setConnectionMessage({ 
          type: 'success', 
          text: t('profile.openBanking.connectionSuccess')
        })
        loadAccounts()
      } else if (event.data.type === 'BANK_CONNECTION_ERROR') {
        // Connection failed
        setLoading(false)
        setConnectionMessage({ 
          type: 'error', 
          text: event.data.error || t('profile.openBanking.connectionError')
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [t])

  /**
   * Auto-dismiss success/info messages after 5 seconds
   */
  useEffect(() => {
    if (connectionMessage.type === 'success' || connectionMessage.type === 'info') {
      const timer = setTimeout(() => {
        setConnectionMessage({ type: '', text: '' })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [connectionMessage])

  /**
   * Load connected bank accounts
   */
  const loadAccounts = async () => {
    try {
      // Assuming import is handled at top level or we use dynamic import if circle dep issues
      // But simplifying here: Profile.jsx relies on imports added at top
      const data = await import('../services/openBanking').then(m => m.openBankingService.getAccounts())
      setAccounts(data)
    } catch (error) {
      console.error('Failed to load accounts', error)
    }
  }

  /**
   * Load available banks for selected country
   */
  const loadBanks = async () => {
    try {
      const data = await import('../services/openBanking').then(m => m.openBankingService.getAspsps(country))
      setBanks(data)
    } catch (error) {
      console.error('Failed to load banks', error)
    }
  }

  /**
   * Handle bank connection with popup window
   * Opens authorization in a popup and monitors for completion
   */
  const handleConnect = async () => {
    if (!selectedBank) return
    
    try {
      setLoading(true)
      setConnectionMessage({ type: '', text: '' })
      
      const service = await import('../services/openBanking').then(m => m.openBankingService)
      const authUrl = await service.startAuthorization(selectedBank, country)
      
      // Get backend URL to construct callback URL
      const backendUrl = getBackendUrl()
      const callbackUrl = `${backendUrl}/api/open-banking/callback`
      
      // Open popup window with appropriate size
      const popupWidth = 600
      const popupHeight = 700
      const left = (window.screen.width - popupWidth) / 2
      const top = (window.screen.height - popupHeight) / 2
      
      const popup = window.open(
        authUrl,
        'BankAuthorization',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )
      
      if (!popup) {
        throw new Error(t('profile.openBanking.popupBlocked'))
      }
      
      // Store interval IDs for cleanup
      let checkPopupInterval = null
      let backendPollInterval = null
      let timeoutId = null
      
      // Helper function to cleanup all intervals and close popup
      const cleanup = () => {
        if (checkPopupInterval) clearInterval(checkPopupInterval)
        if (backendPollInterval) clearInterval(backendPollInterval)
        if (timeoutId) clearTimeout(timeoutId)
        if (popup && !popup.closed) {
          popup.close()
        }
      }
      
      // Helper function to handle successful connection
      const handleSuccess = async () => {
        cleanup()
        setLoading(false)
              setConnectionMessage({ 
                type: 'success', 
                text: t('profile.openBanking.connectionSuccess')
              })
        // Reload accounts after short delay to allow backend processing
        setTimeout(() => {
          loadAccounts()
        }, 1000)
      }
      
      // Monitor popup for callback completion
      checkPopupInterval = setInterval(() => {
        try {
          // Check if popup was closed by user
          if (popup.closed) {
            cleanup()
            setLoading(false)
            // Don't show message if we already got a success/error message from postMessage
            if (!connectionMessage.text) {
              setConnectionMessage({ 
                type: 'info', 
                text: t('profile.openBanking.windowClosed')
              })
              // Reload accounts in case authorization completed before popup closed
              setTimeout(() => {
                loadAccounts()
              }, 2000)
            }
            return
          }
          
          // Check if popup has redirected to callback page
          // Note: We can only check location if popup is on same origin
          try {
            const popupUrl = popup.location.href
            if (popupUrl.includes('/bank-callback')) {
              // Popup is on callback page - it will send postMessage when done
              // Just wait for the message, no need to do anything here
            }
          } catch (e) {
            // Cross-origin error - popup has navigated to bank's domain
            // This is expected, continue polling
            // The callback page will send postMessage when it completes
          }
        } catch (error) {
          console.error('Error checking popup status:', error)
        }
      }, 500) // Check every 500ms
      
      // Fallback: Also poll backend to check if connection was established
      // This handles cases where popup redirects to cross-origin and we can't detect it
      backendPollInterval = setInterval(async () => {
        try {
          const currentAccounts = await import('../services/openBanking')
            .then(m => m.openBankingService.getAccounts())
          
          // If we got new accounts, authorization likely completed
          if (currentAccounts.length > accounts.length) {
            handleSuccess()
            setAccounts(currentAccounts)
          }
        } catch (error) {
          // Ignore polling errors
        }
      }, 2000) // Poll backend every 2 seconds
      
      // Cleanup intervals after 10 minutes (timeout)
      timeoutId = setTimeout(() => {
        cleanup()
        setLoading(false)
        setConnectionMessage({ 
          type: 'error', 
          text: t('profile.openBanking.timeout')
        })
      }, 600000) // 10 minutes timeout
      
    } catch (error) {
      console.error('Error connecting bank:', error)
      setLoading(false)
      setConnectionMessage({ 
        type: 'error', 
        text: error.message || t('profile.openBanking.connectionError')
      })
    }
  }

  /**
   * Handle disconnecting all bank accounts
   */
  const handleDisconnect = async () => {
    if (!window.confirm(t('profile.openBanking.disconnectConfirm'))) return
    try {
      const service = await import('../services/openBanking').then(m => m.openBankingService)
      await service.disconnect()
      setAccounts([])
      setConnectionMessage({ 
        type: 'success', 
        text: t('profile.openBanking.disconnectSuccess')
      })
    } catch (error) {
      setConnectionMessage({ 
        type: 'error', 
        text: t('profile.openBanking.disconnectError')
      })
    }
  }

  /**
   * Handle disconnecting a single account
   */
  const handleDisconnectAccount = async (accountId, accountName) => {
    if (!window.confirm(t('profile.openBanking.disconnectAccountConfirm', { account: accountName || 'this account' }))) return
    try {
      const service = await import('../services/openBanking').then(m => m.openBankingService)
      await service.disconnectAccount(accountId)
      // Reload accounts to reflect the change
      await loadAccounts()
      setConnectionMessage({ 
        type: 'success', 
        text: t('profile.openBanking.disconnectAccountSuccess')
      })
    } catch (error) {
      console.error('Disconnect account error:', error)
      let errorMessage = error.message || t('profile.openBanking.disconnectAccountError')
      
      // Handle specific error cases
      if (error.message && error.message.includes('Unauthorized')) {
        errorMessage = t('profile.openBanking.unauthorized') || 'Please log in again to disconnect accounts'
      }
      
      setConnectionMessage({ 
        type: 'error', 
        text: errorMessage
      })
    }
  }

  /**
   * Format currency amount
   */
  const formatCurrency = (amount, currency) => {
    if (amount == null) return t('profile.openBanking.balanceNotAvailable', 'N/A')
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    } catch {
      return `${amount} ${currency || 'EUR'}`
    }
  }

  /**
   * Format date
   */
  const formatDate = (date) => {
    if (!date) return t('profile.openBanking.never', 'Never')
    try {
      return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return date
    }
  }

  return (
    <div className="bank-connections">
      {/* Connection Status Message */}
      {connectionMessage.text && (
        <div className={`alert alert-${connectionMessage.type}`} style={{ marginBottom: '1rem' }}>
          {connectionMessage.text}
        </div>
      )}

      {accounts.length > 0 ? (
        <div className="connected-accounts">
          <h3>{t('profile.openBanking.connectedAccounts')}</h3>
          <div className="account-list">
            {accounts.map(acc => (
              <div key={acc.id} className="account-item">
                <div className="account-icon">🏦</div>
                <div className="account-details">
                  <div className="account-header">
                    <strong className="account-bank-name">{acc.bankName || t('profile.openBanking.unknownBank', 'Unknown Bank')}</strong>
                    <button
                      onClick={() => handleDisconnectAccount(acc.id, acc.accountName || acc.iban)}
                      className="btn-icon btn-disconnect-account"
                      title={t('profile.openBanking.disconnectAccount', 'Disconnect this account')}
                      aria-label={t('profile.openBanking.disconnectAccount', 'Disconnect this account')}
                    >
                      <FiPower size={18} />
                    </button>
                  </div>
                  
                  {acc.accountName && (
                    <div className="account-name">
                      <FiCreditCard size={14} />
                      <span>{acc.accountName}</span>
                    </div>
                  )}
                  
                  {acc.iban && (
                    <div className="account-iban">
                      <span className="iban-label">{t('profile.openBanking.iban', 'IBAN')}:</span>
                      <span className="iban-value">{acc.iban}</span>
                    </div>
                  )}
                  
                  {acc.accountType && (
                    <div className="account-type">
                      <span className="type-label">{t('profile.openBanking.accountType', 'Type')}:</span>
                      <span className="type-value">{acc.accountType}</span>
                    </div>
                  )}
                  
                  {acc.lastBalanceUpdate && (
                    <div className="account-last-update">
                      <FiCalendar size={12} />
                      <span>{t('profile.openBanking.lastUpdated', 'Last updated')}: {formatDate(acc.lastBalanceUpdate)}</span>
                    </div>
                  )}
                </div>
                <div className="account-balance">
                  <div className="balance-amount">
                    {formatCurrency(acc.currentBalance, acc.currency)}
                  </div>
                  {acc.currency && (
                    <div className="balance-currency">{acc.currency}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleDisconnect} className="btn btn-danger btn-sm" style={{ marginTop: '1rem' }}>
            <FiTrash2 size={16} />
            {t('profile.openBanking.disconnectAll')}
          </button>
        </div>
      ) : (
        <div className="connect-new">
          <p>{t('profile.openBanking.connectDescription')}</p>
          <div className="bank-selector" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="form-select"
              style={{ width: 'auto' }}
            >
              <option value="FI">Finland (FI)</option>
              <option value="SE">Sweden (SE)</option>
              <option value="NO">Norway (NO)</option>
              <option value="DK">Denmark (DK)</option>
              <option value="GR">Greece (GR)</option>
              <option value="DE">Germany (DE)</option>
              <option value="ES">Spain (ES)</option>
              <option value="IT">Italy (IT)</option>
              <option value="FR">France (FR)</option>
              <option value="EE">Estonia (EE)</option>
              <option value="LV">Latvia (LV)</option>
              <option value="LT">Lithuania (LT)</option>
              <option value="BE">Belgium (BE)</option>
              <option value="NL">Netherlands (NL)</option>
              <option value="AT">Austria (AT)</option>
              <option value="BG">Bulgaria (BG)</option>
              <option value="HR">Croatia (HR)</option>
              <option value="CY">Cyprus (CY)</option>
              <option value="CZ">Czech Republic (CZ)</option>
              <option value="HU">Hungary (HU)</option>
              <option value="IE">Ireland (IE)</option>
              <option value="PL">Poland (PL)</option>
              <option value="PT">Portugal (PT)</option>
              <option value="RO">Romania (RO)</option>
              <option value="SK">Slovakia (SK)</option>
              <option value="SI">Slovenia (SI)</option>
            </select>

            <select
              value={selectedBank}
              onChange={e => setSelectedBank(e.target.value)}
              className="form-select"
              style={{ flex: 1 }}
            >
              <option value="">{t('profile.openBanking.selectBank')}</option>
              {banks.map(bank => (
                <option key={bank.name} value={bank.name}>{bank.title || bank.name}</option>
              ))}
            </select>

            <button
              onClick={handleConnect}
              disabled={!selectedBank || loading}
              className="btn btn-primary"
            >
              {loading ? t('profile.openBanking.connecting') : t('profile.openBanking.connect')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
