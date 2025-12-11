import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { authService } from '../services/auth'
import { sessionManager } from '../services/sessionManager'
import TwoFactorVerification from '../components/TwoFactorVerification'
import './Login.css'

/**
 * Login Page Component
 * Handles user authentication (sign in and sign up)
 */
function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Get redirect URL and mode from query parameters
  const redirectUrl = searchParams.get('redirect')
  const mode = searchParams.get('mode')

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  /**
   * Check URL parameters on mount
   */
  useEffect(() => {
    // Check if mode=signup is in the URL
    if (mode === 'signup') {
      setIsSignUp(true)
    }

    // Pre-fill email if there's a pending invitation token
    const pendingToken = sessionStorage.getItem('pendingInvitationToken')
    if (pendingToken) {
      // Try to get the invitation details to pre-fill email
      // This is optional - we can skip it for now
    }
  }, [mode])

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

        // After signup, check if there's a redirect URL (e.g., from invitation)
        if (redirectUrl) {
          // Wait a moment for the user to see the success message
          setTimeout(() => {
            navigate(redirectUrl)
          }, 2000)
        }
      } else {
        // Sign in existing user
        const response = await authService.signIn(formData.email, formData.password)

        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          setRequires2FA(true)
          setTempToken(response.tempToken)
          setUserEmail(formData.email)
        } else {
          // No 2FA required - login successful
          // Session is already stored by authService.storeAuthData
          // The storeSession() method automatically broadcasts SESSION_CREATED
          // which will invalidate other tabs with the same user

          // Trigger event to notify App.jsx that session has changed
          window.dispatchEvent(new CustomEvent('auth-storage-change'))

          // Wait for App.jsx to update session state before navigating
          // Poll sessionStorage to ensure it's actually stored
          let attempts = 0
          const maxAttempts = 10
          while (attempts < maxAttempts) {
            const token = sessionManager.getToken()
            const user = sessionManager.getCurrentUser()
            if (token && user) {
              // Session is stored, wait a bit more for App.jsx to update state
              await new Promise(resolve => setTimeout(resolve, 100))
              break
            }
            await new Promise(resolve => setTimeout(resolve, 50))
            attempts++
          }

          // Check if there's a redirect URL
          const targetPath = redirectUrl || '/dashboard'

          // Navigate to dashboard
          navigate(targetPath, { replace: true })
        }
      }
    } catch (err) {
      const errorMessage = err.message || t('messages.operationFailed')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle successful 2FA verification
   */
  const handle2FASuccessRef = useRef(false); // Prevent multiple navigation calls

  const handle2FASuccess = async () => {
    // Prevent multiple navigation calls (infinite loop protection)
    if (handle2FASuccessRef.current) {
      return;
    }

    try {
      handle2FASuccessRef.current = true;

      // Token is already stored by TwoFactorVerification component
      // Ensure sessionStorage is written (mobile browsers may need more time)
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verify tokens are actually stored in sessionStorage
      const token = sessionManager.getToken()
      const user = sessionManager.getCurrentUser()

      if (!token || !user) {
        console.error('Tokens not stored properly after 2FA verification')
        throw new Error('Failed to store authentication data')
      }

      // Broadcast session invalidation to other tabs if same user
      const currentUserId = sessionManager.getCurrentUserId()
      if (currentUserId && currentUserId === user.id) {
        sessionManager.broadcastSessionInvalidation(user.id)
      }

      // Trigger a custom event to notify App.jsx that session has changed
      window.dispatchEvent(new CustomEvent('auth-storage-change'))

      // Detect if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      if (isMobile) {
        // For mobile browsers, use window.location for more reliable navigation
        // This ensures a full page reload which properly initializes App.jsx
        const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
        const targetPath = redirectUrl || '/dashboard'
        const fullPath = `${basename}${targetPath}`

        // Use window.location for mobile compatibility
        // This forces a full reload which ensures App.jsx re-checks session
        window.location.href = fullPath
      } else {
        // For desktop, use React Router navigation (faster, no reload)
        // Longer delay for event processing
        await new Promise(resolve => setTimeout(resolve, 200))

        // Check if there's a redirect URL
        if (redirectUrl) {
          navigate(redirectUrl, { replace: true })
        } else {
          // Navigate to dashboard - App.jsx should now detect the session
          navigate('/dashboard', { replace: true })
        }
      }
    } catch (error) {
      console.error('Error handling 2FA success:', error)
      handle2FASuccessRef.current = false; // Reset on error so user can retry
      setError('Failed to complete login. Please try again.')
    }
  }

  /**
   * Handle 2FA cancellation
   */
  const handle2FACancel = () => {
    setRequires2FA(false)
    setTempToken('')
    setUserEmail('')
    setFormData({ email: '', password: '', confirmPassword: '' })
    handle2FASuccessRef.current = false // Reset to allow retry
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

  // Show 2FA verification screen if required
  if (requires2FA) {
    return (
      <TwoFactorVerification
        email={userEmail}
        tempToken={tempToken}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Mobile Branding - shown on mobile only */}
        <div className="login-branding-mobile">
          <img
            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
            alt="Paire Logo"
            className="brand-logo"
            width="60"
            height="60"
          />
          <h1>{t('app.title')}</h1>
          <p>{t('app.tagline')}</p>
        </div>

        {/* Left side - Branding (Desktop/Tablet) */}
        <div className="login-branding">
          <div className="branding-content">
            <img
              src={`${import.meta.env.BASE_URL}paire-logo.svg`}
              alt="Paire Logo"
              className="brand-logo"
              width="80"
              height="80"
            />
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
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <FiLock size={18} />
                    {t('auth.confirmPassword')}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Link (Sign In only) */}
              {!isSignUp && (
                <div className="forgot-password-link">
                  <Link to="/forgot-password">
                    {t('auth.forgotPassword')}
                  </Link>
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

