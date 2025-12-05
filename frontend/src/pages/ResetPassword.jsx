import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiLock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { authService } from '../services/auth'
import './ResetPassword.css'

/**
 * Reset Password Landing Page
 * Handles password reset when user clicks link from email
 */
function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.')
      return
    }

    try {
      setLoading(true)
      await authService.confirmResetPassword(token, email, formData.newPassword)
      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  // Invalid link
  if (!token || !email) {
    return (
      <div className="reset-password-page">
        <div className="reset-container">
          <div className="reset-card">
            <div className="reset-logo">
              <img src="/paire-logo.svg" alt={t('app.title')} width="80" height="80" />
            </div>

            <div className="reset-content error">
              <FiAlertCircle size={64} />
              <h1>Invalid Reset Link</h1>
              <p>This password reset link is invalid or has expired.</p>
              
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-container">
          <div className="reset-card">
            <div className="reset-logo">
              <img src="/paire-logo.svg" alt={t('app.title')} width="80" height="80" />
            </div>

            <div className="reset-content success">
              <FiCheckCircle size={64} />
              <h1>Password Reset Successful!</h1>
              <p>Your password has been changed successfully.</p>
              <p className="redirect-message">Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="reset-password-page">
      <div className="reset-container">
        <div className="reset-card">
          {/* Logo */}
          <div className="reset-logo">
            <img src="/paire-logo.svg" alt={t('app.title')} width="80" height="80" />
          </div>

          {/* Header */}
          <div className="reset-header">
            <FiLock size={48} />
            <h1>Reset Password</h1>
            <p>Enter your new password below</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <FiAlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="reset-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <small className="form-hint">Minimum 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="reset-footer">
            <button 
              onClick={() => navigate('/login')}
              className="link-button"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

