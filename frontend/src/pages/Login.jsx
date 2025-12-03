import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail, FiLock, FiHeart } from 'react-icons/fi'
import { authService } from '../services/supabase'
import './Login.css'

/**
 * Login Page Component
 * Handles user authentication (sign in and sign up)
 */
function Login() {
  const { t } = useTranslation()
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error on input change
  }

  /**
   * Validate form data
   */
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError(t('messages.fillRequired'))
      return false
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    return true
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        // Sign up new user
        await authService.signUp(formData.email, formData.password)
        setSuccess('Account created successfully! Please check your email to verify.')
      } else {
        // Sign in existing user
        await authService.signIn(formData.email, formData.password)
        // Navigation handled by App.jsx through session state
      }
    } catch (err) {
      setError(err.message || t('messages.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Toggle between sign in and sign up
   */
  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setSuccess('')
    setFormData({ email: '', password: '', confirmPassword: '' })
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <FiHeart size={64} className="heart-icon" />
            <h1>{t('app.title')}</h1>
            <p>{t('app.tagline')}</p>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="login-form-container">
          <div className="login-form-wrapper">
            <h2 className="form-title">
              {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
            </h2>

            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {/* Login/Signup Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {/* Email Input */}
              <div className="form-group">
                <label htmlFor="email">
                  <FiMail size={18} />
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="password">
                  <FiLock size={18} />
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <FiLock size={18} />
                    {t('auth.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    {t('common.loading')}
                  </>
                ) : (
                  isSignUp ? t('auth.signup') : t('auth.login')
                )}
              </button>
            </form>

            {/* Toggle Sign In/Sign Up */}
            <div className="form-footer">
              <p>
                {isSignUp 
                  ? t('auth.alreadyHaveAccount')
                  : t('auth.dontHaveAccount')
                }
              </p>
              <button 
                type="button"
                className="btn-link"
                onClick={toggleMode}
              >
                {isSignUp ? t('auth.login') : t('auth.signup')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

