import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { authService } from '../services/auth'
import { sessionManager } from '../services/sessionManager'
import TwoFactorVerification from '../components/TwoFactorVerification'
import './Login.css'

/**
 * Maps API/network error causes to humanized, translated messages.
 * @param {Error} err - Caught error from signIn/signUp
 * @param {boolean} isSignUp - Whether the action was sign-up (affects duplicate-email mapping)
 * @param {Function} t - i18n translate function
 * @returns {string} Humanized error message
 */
function humanizeLoginError(err, isSignUp, t) {
  const msg = (err?.message || '').toLowerCase()
  const isNetwork = err?.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('cannot connect to api')
  if (isNetwork) return t('auth.errors.networkError')
  if (msg.includes('auth service unavailable') || msg.includes('503') || msg.includes('service unavailable')) return t('auth.errors.authServiceUnavailable')
  if (msg.includes('invalid') || msg.includes('unauthorized') || msg.includes('401') || msg.includes('incorrect') || msg.includes('wrong password') || msg.includes('invalid login') || msg.includes('session expired')) return t('auth.errors.invalidCredentials')
  if (msg.includes('confirm your email') || msg.includes('verify your email') || msg.includes('email not confirmed')) return t('auth.errors.emailNotConfirmed')
  if (msg.includes('locked') || msg.includes('lockout')) return t('auth.errors.accountLocked')
  if (isSignUp && (msg.includes('already taken') || msg.includes('already registered') || msg.includes('duplicate') || msg.includes('already exists'))) return t('auth.errors.emailAlreadyRegistered')
  // Generic: use server message if short and readable, else fallback
  const raw = err?.message || ''
  if (raw.length > 0 && raw.length < 120 && !raw.includes(' at ') && !raw.startsWith('http')) return raw
  return t('auth.errors.generic')
}

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
  const [twoFactorFingerprint, setTwoFactorFingerprint] = useState(null) // Device fingerprint for 2FA completion

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    emailNotificationsEnabled: false,
    acceptedTerms: false
  })

  // Remember Me state
  const [rememberMe, setRememberMe] = useState(false)

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isConfirmPasswordTouched, setIsConfirmPasswordTouched] = useState(false)

  // Derived state for password match
  const passwordsMatch = formData.password === formData.confirmPassword
  const showMatchError = isSignUp && isConfirmPasswordTouched && !passwordsMatch && formData.confirmPassword.length > 0
  const showMatchSuccess = isSignUp && passwordsMatch && formData.confirmPassword.length > 0

  /**
   * Check URL parameters and load saved email on mount
   */
  useEffect(() => {
    // Check if mode=signup is in the URL
    if (mode === 'signup') {
      setIsSignUp(true)
    }

    // Load saved email if exists
    const savedEmail = localStorage.getItem('last_user_email')
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
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
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    if (name === 'confirmPassword') {
      setIsConfirmPasswordTouched(true)
    }

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

    if (isSignUp && !formData.acceptedTerms) {
      setError(t('auth.termsRequired'))
      return false
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return false
    }

    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort'))
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
        await authService.signUp(
          formData.email,
          formData.password,
          '', // displayName
          formData.emailNotificationsEnabled
        )
        setSuccess(t('auth.registrationSuccess'))

        // After signup: redirect to invitation URL if present, otherwise to login after a short delay
        if (redirectUrl) {
          setTimeout(() => {
            navigate(redirectUrl)
          }, 2000)
        } else {
          // Let user see the success message, then redirect to login so they can sign in
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2500)
        }
      } else {
        // Handle "Remember Email" persistence
        if (rememberMe) {
          localStorage.setItem('last_user_email', formData.email)
        } else {
          localStorage.removeItem('last_user_email')
        }

        // Sign in existing user
        const response = await authService.signIn(formData.email, formData.password, rememberMe)

        // Check if 2FA is required
        if (response.requiresTwoFactor) {
          setRequires2FA(true)
          setTempToken(response.tempToken)
          setUserEmail(formData.email)
          // Store device fingerprint for 2FA completion (returned from auth.js)
          setTwoFactorFingerprint(response.deviceFingerprint || null)
        } else {
          // No 2FA required - login successful
          // Session is already stored by authService.storeAuthData
          // The storeSession() method automatically broadcasts SESSION_CREATED
          // which will invalidate other tabs with the same user

          // Trigger event to notify App.jsx that session has changed
          window.dispatchEvent(new CustomEvent('auth-storage-change'))

          // Wait for App.jsx to update session state before navigating
          // Poll sessionStorage/localStorage to ensure it's actually stored
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

          // Detect if we're on a mobile device
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

          if (isMobile) {
            // For mobile browsers, use window.location for more reliable navigation
            // This ensures a full page reload which properly initializes App.jsx and fixes the empty sidebar issue
            const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
            const fullPath = `${basename}${targetPath}`
            window.location.href = fullPath
          } else {
            // For desktop, use React Router navigation (faster, no reload)
            // Navigate to dashboard
            navigate(targetPath, { replace: true })
          }
        }
      }
    } catch (err) {
      setError(humanizeLoginError(err, isSignUp, t))
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
        // Try one more time with a small delay
        await new Promise(resolve => setTimeout(resolve, 300))
        const retryToken = sessionManager.getToken()
        if (!retryToken) {
          throw new Error('Failed to store authentication data')
        }
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
      setError(t('auth.errors.twoFactorCompleteFailed'))
    }
  }

  /**
   * Handle 2FA cancellation
   */
  const handle2FACancel = () => {
    setRequires2FA(false)
    setTempToken('')
    setUserEmail('')
    setTwoFactorFingerprint(null) // Clear device fingerprint
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
    setFormData({ email: '', password: '', confirmPassword: '', emailNotificationsEnabled: false, acceptedTerms: false })
    setIsConfirmPasswordTouched(false)
  }

  // Show 2FA verification screen if required
  if (requires2FA) {
    return (
      <TwoFactorVerification
        email={userEmail}
        tempToken={tempToken}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
        rememberMe={rememberMe}
        deviceFingerprint={twoFactorFingerprint}
      />
    )
  }

  return (
    <div className="login-page">
      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Mobile Branding - shown on mobile only */}
        <motion.div
          className="login-branding-mobile"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <img
            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
            alt="Paire Logo"
            className="brand-logo"
            width="60"
            height="60"
          />
          <h1>{t('app.title')}</h1>
          <p>{t('app.tagline')}</p>
        </motion.div>

        {/* Left side - Branding (Desktop/Tablet) */}
        <motion.div
          className="login-branding"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            className="branding-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}paire-logo.svg`}
              alt="Paire Logo"
              className="brand-logo"
              width="80"
              height="80"
            />
            <h1>{t('app.title')}</h1>
            <p>{t('app.tagline')}</p>
          </motion.div>
        </motion.div>

        {/* Right side - Form */}
        <motion.div
          className="login-form-container"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            className="login-form-wrapper"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            <motion.h2
              className="form-title"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }
                }
              }}
            >
              {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
            </motion.h2>

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
            <motion.form
              onSubmit={handleSubmit}
              className="login-form"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08
                  }
                }
              }}
            >
              {/* Email Input */}
              <motion.div
                className="form-group"
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }
                }}
              >
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
              </motion.div>

              {/* Password Input */}
              <motion.div
                className="form-group"
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }
                }}
              >
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
              </motion.div>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <>
                  <motion.div
                    className="form-group"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
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
                    {/* Password Match Indicator */}
                    {isSignUp && formData.confirmPassword.length > 0 && (
                      <div className={`password-match-indicator ${passwordsMatch ? 'match-success' : 'match-error'}`}>
                        <small style={{
                          color: passwordsMatch ? '#10B981' : '#EF4444',
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.85rem'
                        }}>
                          {passwordsMatch ? (
                            <>
                              <span>✓</span> Passwords match
                            </>
                          ) : (
                            <>
                              <span>✕</span> Passwords do not match
                            </>
                          )}
                        </small>
                      </div>
                    )}
                  </motion.div>

                  {/* Terms and Agreement (required for sign-up) */}
                  <motion.div
                    className="form-group checkbox-group terms-checkbox-group"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
                    <label className="checkbox-label" htmlFor="acceptedTerms">
                      <input
                        type="checkbox"
                        id="acceptedTerms"
                        name="acceptedTerms"
                        checked={formData.acceptedTerms}
                        onChange={(e) => {
                          setFormData({ ...formData, acceptedTerms: e.target.checked })
                          setError('')
                        }}
                        required={isSignUp}
                        aria-required={isSignUp}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        {t('auth.agreeToTerms')}{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="terms-link">
                          {t('legal.termsOfService')}
                        </Link>
                      </span>
                    </label>
                  </motion.div>

                  <motion.div
                    className="form-group checkbox-group"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
                    <label className="checkbox-label" htmlFor="emailNotificationsEnabled">
                      <input
                        type="checkbox"
                        id="emailNotificationsEnabled"
                        name="emailNotificationsEnabled"
                        checked={formData.emailNotificationsEnabled}
                        onChange={(e) => setFormData({ ...formData, emailNotificationsEnabled: e.target.checked })}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        {t('auth.enableEmailNotifications') || 'Receive email notifications'}
                      </span>
                    </label>
                  </motion.div>
                </>
              )}

              {/* Remember Me and Forgot Password - separate rows so link is always clickable */}
              {!isSignUp && (
                <>
                  <motion.div
                    className="form-group remember-me-row"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
                    <label className="checkbox-label remember-me-label" htmlFor="rememberMe">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">{t('auth.rememberMe') || 'Remember me'}</span>
                    </label>
                  </motion.div>
                  <motion.div
                    className="form-group forgot-password-row"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
                    <div className="forgot-password-link">
                      <Link to="/forgot-password">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}

              {/* Submit Button */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }
                }}
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
              </motion.button>
            </motion.form>

            {/* Toggle Sign In/Sign Up */}
            <motion.div
              className="form-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
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
            </motion.div>

            <div className="login-footer-links">
              <Link to="/terms">{t('legal.termsOfService')}</Link>
              <Link to="/privacy">
                {t('legal.privacyPolicy')}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login

