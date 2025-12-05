import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  }, [])

  // Countdown timer for redirect
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (status === 'success' && countdown === 0) {
      navigate('/login')
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
        <div className="confirmation-card">
          {/* Logo */}
          <div className="confirmation-logo">
            <img 
              src="/paire-logo.svg" 
              alt={t('app.title')} 
              width="80"
              height="80"
            />
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="confirmation-content">
              <div className="confirmation-icon loading">
                <FiLoader size={64} className="spin" />
              </div>
              <h1>{t('emailConfirmation.confirmingTitle')}</h1>
              <p>{t('emailConfirmation.confirmingMessage')}</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="confirmation-content success">
              <div className="confirmation-icon">
                <FiCheckCircle size={64} />
              </div>
              <h1>{t('emailConfirmation.confirmedTitle')}</h1>
              <p className="success-message">{message}</p>
              
              <div className="redirect-notice">
                <FiMail size={20} />
                <p>{t('emailConfirmation.redirecting', { count: countdown })}...</p>
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                {t('emailConfirmation.goToLogin')}
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="confirmation-content error">
              <div className="confirmation-icon">
                <FiXCircle size={64} />
              </div>
              <h1>{t('emailConfirmation.failedTitle')}</h1>
              <p className="error-message">{message}</p>
              
              <div className="error-actions">
                <button 
                  onClick={handleResendConfirmation}
                  className="btn btn-secondary"
                >
                  <FiMail size={18} />
                  {t('emailConfirmation.resendConfirmation')}
                </button>
                
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-outline"
                >
                  {t('emailConfirmation.backToLogin')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="confirmation-footer">
          <p>&copy; 2025 {t('app.title')}. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmation

