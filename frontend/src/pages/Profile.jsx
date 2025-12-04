import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUser, FiMail, FiGlobe, FiLock, FiCamera, FiSave } from 'react-icons/fi'
import { authService } from '../services/supabase'
import { profileService } from '../services/api'
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
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })

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

      // Update profile
      await profileService.updateProfile(user.id, {
        display_name: profileData.display_name,
        avatar_url: avatarUrl,
        email: user.email
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
      await authService.updatePassword(passwordData.newPassword)
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setShowPasswordForm(false)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' })
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
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
                placeholder="Enter new password"
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
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordData({ newPassword: '', confirmPassword: '' })
                }}
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
    </div>
  )
}

export default Profile
