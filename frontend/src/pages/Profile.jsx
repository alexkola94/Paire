import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiGlobe, FiLock, FiCamera, FiSave, FiTrash2, FiAlertTriangle, FiDatabase } from 'react-icons/fi'
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
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
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
      </motion.div>

      {/* Language Settings */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
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
      </motion.div>

      {/* Password Settings */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
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
      </motion.div>

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

      {/* Legal Information */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="card-header">
          <h2>
            <FiLock size={24} />
            Legal Information
          </h2>
        </div>
        <div className="legal-links" style={{ padding: '1rem' }}>
          <Link to="/privacy" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <FiLock size={18} style={{ marginRight: '8px' }} />
            {t('legal.privacyPolicy')}
          </Link>
        </div>
      </motion.div>

      {/* Data Management - Clear All Data */}
      <motion.div 
        className="card data-management"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="card-header">
          <h2>
            <FiDatabase size={24} />
            {t('profile.clearData.title', 'Data Management')}
          </h2>
        </div>

        <div className="data-management-content">
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
            <div className="data-actions">
              <p className="section-description">
                {t('profile.clearData.description', 'Manage your account data and settings.')}
              </p>

              <button
                onClick={() => setShowClearDataModal(true)}
                className="btn btn-outline-danger"
              >
                <FiTrash2 size={18} />
                {t('profile.clearData.buttonText')}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="modal-overlay">
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

// End of Profile component



export default Profile

