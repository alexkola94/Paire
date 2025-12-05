import { useState, useEffect, useRef, useCallback } from 'react';
import OtpInput from 'react-otp-input';
import { useTranslation } from 'react-i18next';
import { getBackendUrl } from '../utils/getBackendUrl';
import './TwoFactorVerification.css';

/**
 * Two-Factor Authentication Verification Component
 * Used during login to verify 2FA code or backup code
 * 
 * @param {Object} props
 * @param {string} props.email - User's email
 * @param {string} props.tempToken - Temporary token from login
 * @param {Function} props.onSuccess - Callback on successful verification
 * @param {Function} props.onCancel - Callback to cancel and go back
 */
const TwoFactorVerification = ({ email, tempToken, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const hasAutoVerified = useRef(false);
  const isVerifyingRef = useRef(false);
  const hasCalledOnSuccess = useRef(false); // Prevent multiple success calls

  /**
   * Verify 2FA code
   */
  const handleVerifyCode = useCallback(async (codeToVerify = null) => {
    // Prevent multiple calls if already succeeded
    if (hasCalledOnSuccess.current) {
      return;
    }
    
    const code = codeToVerify || verificationCode;
    
    // Normalize and validate code
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
    
    if (normalizedCode.length !== 6 || !normalizedCode.match(/^\d{6}$/)) {
      setError(t('twoFactor.invalidCode') || 'Please enter a valid 6-digit code.');
      hasAutoVerified.current = false;
      return;
    }

    // Prevent multiple simultaneous verification attempts
    if (isVerifyingRef.current) {
      return;
    }

    isVerifyingRef.current = true;
    setLoading(true);
    setError('');

    // Safety timeout to prevent infinite loading (30 seconds)
    const timeoutId = setTimeout(() => {
      if (isVerifyingRef.current) {
        setLoading(false);
        isVerifyingRef.current = false;
        hasAutoVerified.current = false;
        setError(t('twoFactor.verificationError') || 'Request timed out. Please try again.');
      }
    }, 30000);

    try {
      // Log for debugging (remove in production)
      console.log('🔐 [2FA] Verifying code:', {
        email,
        codeLength: normalizedCode.length,
        codeFormat: normalizedCode.match(/^\d{6}$/) ? 'Valid' : 'Invalid',
        hasTempToken: !!tempToken
      });

      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: normalizedCode,
          tempToken,
        }),
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      // Check if response is ok before parsing JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(t('twoFactor.verificationError') || 'Invalid response from server');
      }

      if (!response.ok) {
        // Log error details for debugging
        console.error('❌ [2FA] Verification failed:', {
          status: response.status,
          error: data.error || data.message,
          codeSent: normalizedCode
        });
        throw new Error(data.error || data.message || t('twoFactor.verificationError'));
      }

      // Verify we have the required data
      if (!data.token) {
        throw new Error(t('twoFactor.verificationError') || 'Invalid response: missing token');
      }

      // Store token and user data (use same keys as auth service)
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));

      // Notify parent component of successful login (only once)
      if (onSuccess && !hasCalledOnSuccess.current) {
        hasCalledOnSuccess.current = true;
        onSuccess(data);
      }
    } catch (err) {
      // Handle different error types
      let errorMessage;
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = t('messages.networkError') || 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message || t('twoFactor.verificationError') || 'Verification failed. Please try again.';
      }
      
      setError(errorMessage);
      hasAutoVerified.current = false; // Reset on error so user can try again
      // Don't clear the code - let user edit it
    } finally {
      clearTimeout(timeoutId); // Always clear timeout
      setLoading(false);
      isVerifyingRef.current = false;
    }
  }, [verificationCode, email, tempToken, onSuccess, t]);

  /**
   * Verify backup code
   */
  const handleVerifyBackupCode = async () => {
    if (!backupCode.trim()) {
      setError(t('twoFactor.backupCodeRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/verify-backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: backupCode.trim(),
          tempToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('twoFactor.verificationError'));
      }

      // Store token and user data (use same keys as auth service)
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(data.user));

      // Notify parent component of successful login (only once)
      if (onSuccess && !hasCalledOnSuccess.current) {
        hasCalledOnSuccess.current = true;
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message);
      hasAutoVerified.current = false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (useBackupCode) {
        handleVerifyBackupCode();
      } else if (verificationCode.length === 6) {
        handleVerifyCode();
      }
    }
  };

  // Auto-verify when 6-digit code is complete
  useEffect(() => {
    // Reset auto-verify flag when code length decreases (user deleted characters)
    if (verificationCode.length < 6) {
      hasAutoVerified.current = false;
      return;
    }

    // Only auto-verify if all conditions are met (for manual typing)
    if (
      verificationCode.length === 6 && 
      !loading && 
      !useBackupCode && 
      !hasAutoVerified.current &&
      !isVerifyingRef.current &&
      verificationCode.match(/^\d{6}$/) // Ensure it's exactly 6 digits
    ) {
      hasAutoVerified.current = true;
      
      // Small delay to ensure the last digit is fully entered and visible
      const timer = setTimeout(() => {
        // Double-check conditions before verifying
        if (
          verificationCode.length === 6 && 
          !loading && 
          !isVerifyingRef.current &&
          !hasCalledOnSuccess.current // Don't verify if already succeeded
        ) {
          handleVerifyCode(verificationCode);
        } else {
          hasAutoVerified.current = false;
        }
      }, 500); // Reduced delay for faster response
      return () => clearTimeout(timer);
    }
  }, [verificationCode, loading, useBackupCode, handleVerifyCode]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="two-factor-verification">
      <div className="verification-container">
        {/* Header */}
        <div className="verification-header">
          <div className="security-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2>{t('twoFactor.verificationTitle')}</h2>
          <p className="verification-subtitle">
            {useBackupCode 
              ? t('twoFactor.enterBackupCode') 
              : t('twoFactor.enterVerificationCode')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* Verification Input */}
        {!useBackupCode ? (
          <div className="code-input-section">
            <OtpInput
              value={verificationCode}
              onChange={(code) => {
                // Normalize code - remove any non-digit characters (spaces, dashes, etc.)
                const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
                
                // Stop any ongoing verification if user is editing
                if (isVerifyingRef.current && normalizedCode.length < verificationCode.length) {
                  isVerifyingRef.current = false;
                  setLoading(false);
                }
                
                // Always allow changes - don't block user input
                setVerificationCode(normalizedCode);
                
                // Clear error when user edits the code
                if (error) {
                  setError('');
                }
                
                // Reset auto-verify flag when user edits
                if (normalizedCode.length < 6) {
                  hasAutoVerified.current = false;
                }
              }}
              numInputs={6}
              renderInput={(props) => (
                <input 
                  {...props} 
                  className="verification-otp-input"
                  onKeyPress={handleKeyPress}
                  onPaste={async (e) => {
                    // Handle paste operation
                    e.preventDefault();
                    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
                    // Extract only digits and limit to 6
                    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
                    
                    console.log('📋 [2FA] Paste detected:', { pastedData, digits, length: digits.length });
                    
                    if (digits.length === 6) {
                      setVerificationCode(digits);
                      setError('');
                      hasAutoVerified.current = false; // Reset to allow auto-verify
                      
                      console.log('✅ [2FA] Code pasted, will verify in 600ms');
                      
                      // Wait a moment for UI to update, then verify
                      setTimeout(() => {
                        console.log('🔍 [2FA] Attempting auto-verify after paste:', {
                          codeLength: digits.length,
                          loading,
                          isVerifying: isVerifyingRef.current,
                          hasSucceeded: hasCalledOnSuccess.current
                        });
                        
                        if (digits.length === 6 && !loading && !isVerifyingRef.current && !hasCalledOnSuccess.current) {
                          console.log('🚀 [2FA] Triggering verification from paste handler');
                          handleVerifyCode(digits);
                        } else {
                          console.warn('⚠️ [2FA] Auto-verify blocked:', {
                            codeLength: digits.length,
                            loading,
                            isVerifying: isVerifyingRef.current,
                            hasSucceeded: hasCalledOnSuccess.current
                          });
                        }
                      }, 600);
                    } else {
                      console.warn('⚠️ [2FA] Invalid paste - not 6 digits:', digits);
                    }
                  }}
                  disabled={loading}
                  style={{ 
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'wait' : 'text',
                    // Ensure text is always visible
                    fontSize: 'inherit',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}
                />
              )}
              shouldAutoFocus={!loading}
              inputType="tel"
            />

            {/* Loading indicator when verifying */}
            {loading && (
              <div className="verifying-indicator">
                <span className="loading-spinner"></span>
                <span>{t('twoFactor.verifying') || 'Verifying...'}</span>
              </div>
            )}

            {/* Manual Verify Button (backup for mobile if auto-verify doesn't work) */}
            {!loading && verificationCode.length === 6 && (
              <button
                onClick={() => {
                  hasAutoVerified.current = false;
                  handleVerifyCode(verificationCode);
                }}
                className="verify-btn"
                style={{ marginTop: '1rem' }}
              >
                {t('twoFactor.verify') || 'Verify Code'}
              </button>
            )}
          </div>
        ) : (
          <div className="backup-code-input-section">
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="XXXXXXXX-XXXXXXXX"
              className="backup-code-input"
              autoFocus
              onKeyPress={handleKeyPress}
            />

            <button
              onClick={handleVerifyBackupCode}
              disabled={loading || !backupCode.trim()}
              className="verify-btn"
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                t('twoFactor.verify')
              )}
            </button>
          </div>
        )}

        {/* Toggle Backup Code */}
        <div className="alternative-methods">
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setError('');
              setVerificationCode('');
              setBackupCode('');
              hasAutoVerified.current = false;
              isVerifyingRef.current = false;
              hasCalledOnSuccess.current = false;
            }}
            className="link-btn"
            disabled={loading}
          >
            {useBackupCode 
              ? t('twoFactor.useAuthenticatorCode') 
              : t('twoFactor.useBackupCode')}
          </button>
        </div>

        {/* Help Text */}
        <div className="help-text">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <p>
            {useBackupCode 
              ? t('twoFactor.backupCodeHelp') 
              : t('twoFactor.authenticatorHelp')}
          </p>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="cancel-btn"
          disabled={loading}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

export default TwoFactorVerification;

