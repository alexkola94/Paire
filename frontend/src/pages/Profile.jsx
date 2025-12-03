import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUser, FiMail, FiGlobe, FiLock } from 'react-icons/fi'
import { authService } from '../services/supabase'
import './Profile.css'

/**
 * Profile Page Component
 * User settings and preferences
 */
function Profile() {
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
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
   * Fetch current user
   */
  const loadUser = async () => {
    try {
      setLoading(true)
      const userData = await authService.getUser()
      setUser(userData)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle language change
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
        </div>

        <div className="profile-info">
          <div className="info-item">
            <div className="info-icon">
              <FiMail size={20} />
            </div>
            <div className="info-content">
              <label>{t('profile.emailAddress')}</label>
              <p>{user?.email}</p>
            </div>
          </div>

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
            onClick={() => handleLanguageChange('es')}
            className={`language-btn ${i18n.language === 'es' ? 'active' : ''}`}
          >
            <span className="flag">🇪🇸</span>
            <span>Español</span>
          </button>
          <button
            onClick={() => handleLanguageChange('fr')}
            className={`language-btn ${i18n.language === 'fr' ? 'active' : ''}`}
          >
            <span className="flag">🇫🇷</span>
            <span>Français</span>
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

