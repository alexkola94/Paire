import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { authService } from '../services/auth'
import './ForgotPassword.css'

/**
 * Forgot Password Page Component
 * Allows users to request a password reset email
 */
function ForgotPassword() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Basic email validation
    if (!email || !email.includes('@')) {
      setError(t('auth.invalidEmail'))
      return
    }

    try {
      setLoading(true)
      await authService.resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || t('messages.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    setEmail(e.target.value)
    setError('')
  }

  // Success state
  if (success) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <motion.div 
            className="forgot-password-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Mobile Logo */}
            <div className="forgot-password-logo-mobile">
              <img src={`${import.meta.env.BASE_URL}paire-logo.svg`} alt={t('app.title')} width="60" height="60" />
            </div>

            {/* Desktop Logo */}
            <div className="forgot-password-logo">
              <img src={`${import.meta.env.BASE_URL}paire-logo.svg`} alt={t('app.title')} width="80" height="80" />
            </div>

            <motion.div 
              className="forgot-password-content success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <FiCheckCircle size={64} />
              <h1>{t('auth.forgotPasswordSuccessTitle')}</h1>
              <p>{t('auth.forgotPasswordSuccessMessage')}</p>
              <p className="email-sent-to">{t('auth.emailSentTo')} <strong>{email}</strong></p>
              
              <div className="forgot-password-actions">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <motion.div 
          className="forgot-password-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Mobile Logo */}
          <div className="forgot-password-logo-mobile">
            <img src={`${import.meta.env.BASE_URL}paire-logo.svg`} alt={t('app.title')} width="60" height="60" />
          </div>

          {/* Desktop Logo */}
          <div className="forgot-password-logo">
            <img src={`${import.meta.env.BASE_URL}paire-logo.svg`} alt={t('app.title')} width="80" height="80" />
          </div>

          {/* Header */}
          <motion.div 
            className="forgot-password-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FiMail size={48} />
            <h1>{t('auth.forgotPasswordTitle')}</h1>
            <p>{t('auth.forgotPasswordDescription')}</p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <FiAlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="forgot-password-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="form-group">
              <label htmlFor="email">
                <FiMail size={18} />
                {t('auth.email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  {t('auth.sendingResetLink')}
                </>
              ) : (
                t('auth.sendResetLink')
                )}
            </button>
          </motion.form>

          {/* Footer Link */}
          <div className="forgot-password-footer">
            <Link to="/login" className="back-link">
              <FiArrowLeft size={16} />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ForgotPassword

