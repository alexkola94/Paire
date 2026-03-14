import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiCheckCircle, FiXCircle, FiLoader, FiMail } from 'react-icons/fi'
import { authService } from '../services/auth'
import './EmailConfirmation.css'

/**
 * Email Confirmation Landing Page
 * Handles email confirmation when user clicks link from email
 */
function EmailConfirmation() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    confirmEmail()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for redirect
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (status === 'success' && countdown === 0) {
      if (searchParams.get('isAdmin') === 'true' || searchParams.get('setup2fa') === 'true') {
        navigate('/login?redirect=/setup-2fa')
      } else {
        navigate('/login')
      }
    }
  }, [status, countdown, navigate])

  /**
   * Confirm email with token from URL
   */
  const confirmEmail = async () => {
    try {
      const userId = searchParams.get('userId')
      const token = searchParams.get('token')

      if (!userId || !token) {
        setStatus('error')
        setMessage(t('emailConfirmation.invalidLink'))
        return
      }

      // Call API to confirm email
      await authService.confirmEmail(userId, token)

      setStatus('success')
      setMessage(t('emailConfirmation.confirmedMessage'))
    } catch (error) {
      console.error('Email confirmation error:', error)
      setStatus('error')
      setMessage(error.message || t('emailConfirmation.expiredLink'))
    }
  }

  /**
   * Handle resend confirmation
   */
  const handleResendConfirmation = () => {
    navigate('/login?action=resend')
  }

  return (
    <div className="email-confirmation-page">
      <div className="confirmation-container">
        <motion.div 
          className="confirmation-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Logo */}
          <motion.div 
            className="confirmation-logo"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}paire-logo.svg`}
              alt={t('app.title')}
              width="80"
              height="80"
            />
          </motion.div>

          {/* Loading State */}
          {status === 'loading' && (
            <motion.div 
              className="confirmation-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="confirmation-icon loading">
                <FiLoader size={64} className="spin" />
              </div>
              <h1>{t('emailConfirmation.confirmingTitle')}</h1>
              <p>{t('emailConfirmation.confirmingMessage')}</p>
            </motion.div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <motion.div 
              className="confirmation-content success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="confirmation-icon">
                <FiCheckCircle size={64} />
              </div>
              <h1>{t('emailConfirmation.confirmedTitle')}</h1>
              <p className="success-message">{message}</p>

              {(searchParams.get('isAdmin') === 'true' || searchParams.get('setup2fa') === 'true') && (
                <motion.div 
                  className="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <strong>Next Step:</strong> Please log in to set up Two-Factor Authentication.
                </motion.div>
              )}

              <motion.div 
                className="redirect-notice"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <FiMail size={20} />
                <p>{t('emailConfirmation.redirecting', { count: countdown })}...</p>
              </motion.div>

              <motion.button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('emailConfirmation.goToLogin')}
              </motion.button>
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <motion.div 
              className="confirmation-content error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="confirmation-icon">
                <FiXCircle size={64} />
              </div>
              <h1>{t('emailConfirmation.failedTitle')}</h1>
              <p className="error-message">{message}</p>

              <motion.div 
                className="error-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <motion.button
                  onClick={handleResendConfirmation}
                  className="btn btn-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiMail size={18} />
                  {t('emailConfirmation.resendConfirmation')}
                </motion.button>

                <motion.button
                  onClick={() => navigate('/login')}
                  className="btn btn-outline"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('emailConfirmation.backToLogin')}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="confirmation-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <p>&copy; 2025 {t('app.title')}. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  )
}

export default EmailConfirmation

