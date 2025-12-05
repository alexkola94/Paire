import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import OtpInput from 'react-otp-input';
import { useTranslation } from 'react-i18next';
import { getToken } from '../services/auth';
import { getBackendUrl } from '../utils/getBackendUrl';
import './TwoFactorSetup.css';

/**
 * Two-Factor Authentication Setup Component
 * Allows users to enable/disable 2FA and manage backup codes
 * 
 * @param {Object} props
 * @param {boolean} props.isEnabled - Current 2FA status
 * @param {Function} props.onStatusChange - Callback when 2FA status changes
 */
const TwoFactorSetup = ({ isEnabled, onStatusChange }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Backup codes state
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  
  // Disable state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  /**
   * Initialize 2FA setup - Get QR code from backend
   */
  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = getToken();
      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('twoFactor.setupError'));
      }

      setQrCode(data.qrCodeUrl);
      setSecret(data.manualEntryKey);
      setSetupMode(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify code and enable 2FA
   */
  const handleEnableTwoFactor = async () => {
    if (verificationCode.length !== 6) {
      setError(t('twoFactor.invalidCode'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('twoFactor.enableError'));
      }

      // Show backup codes
      setBackupCodes(data.codes);
      setShowBackupCodes(true);
      setSuccess(t('twoFactor.enableSuccess'));
      setSetupMode(false);
      setVerificationCode('');
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable 2FA with password confirmation
   */
  const handleDisableTwoFactor = async () => {
    if (!disablePassword) {
      setError(t('twoFactor.passwordRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('twoFactor.disableError'));
      }

      setSuccess(t('twoFactor.disableSuccess'));
      setShowDisableModal(false);
      setDisablePassword('');
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regenerate backup codes
   */
  const handleRegenerateBackupCodes = async () => {
    const password = prompt(t('twoFactor.enterPasswordToRegenerate'));
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${getBackendUrl()}/api/auth/2fa/regenerate-backup-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('twoFactor.regenerateError'));
      }

      setBackupCodes(data.codes);
      setShowBackupCodes(true);
      setSuccess(t('twoFactor.regenerateSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download backup codes as text file
   */
  const handleDownloadBackupCodes = () => {
    const content = `You & Me Expenses - Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nStore these codes in a secure place. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'you-me-expenses-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Copy backup codes to clipboard
   */
  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setSuccess(t('twoFactor.copiedToClipboard'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('twoFactor.copyError'));
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="two-factor-setup">
      <div className="two-factor-header">
        <h3>{t('twoFactor.title')}</h3>
        <div className={`status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
          {isEnabled ? t('twoFactor.enabled') : t('twoFactor.disabled')}
        </div>
      </div>

      <p className="two-factor-description">
        {t('twoFactor.description')}
      </p>

      {/* Error/Success Messages */}
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      {/* Setup Mode - Show QR Code and Verification */}
      {setupMode && (
        <div className="setup-container">
          <div className="setup-step">
            <h4>{t('twoFactor.step1')}</h4>
            <p>{t('twoFactor.step1Description')}</p>
            
            {qrCode && (
              <div className="qr-code-container">
                <img src={qrCode} alt="QR Code" className="qr-code" />
              </div>
            )}

            <div className="manual-entry">
              <p>{t('twoFactor.manualEntry')}</p>
              <code className="secret-key">{secret}</code>
            </div>
          </div>

          <div className="setup-step">
            <h4>{t('twoFactor.step2')}</h4>
            <p>{t('twoFactor.step2Description')}</p>
            
            <div className="otp-container">
              <OtpInput
                value={verificationCode}
                onChange={setVerificationCode}
                numInputs={6}
                renderInput={(props) => <input {...props} className="otp-input" />}
                shouldAutoFocus
                inputType="tel"
              />
            </div>

            <div className="setup-actions">
              <button
                onClick={handleEnableTwoFactor}
                disabled={loading || verificationCode.length !== 6}
                className="btn btn-primary"
              >
                {loading ? t('common.loading') : t('twoFactor.verifyAndEnable')}
              </button>
              <button
                onClick={() => {
                  setSetupMode(false);
                  setVerificationCode('');
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display */}
      {showBackupCodes && backupCodes.length > 0 && (
        <div className="backup-codes-container">
          <h4>{t('twoFactor.backupCodes')}</h4>
          <p className="warning-text">{t('twoFactor.backupCodesWarning')}</p>
          
          <div className="backup-codes-grid">
            {backupCodes.map((code, index) => (
              <div key={index} className="backup-code">
                <code>{code}</code>
              </div>
            ))}
          </div>

          <div className="backup-codes-actions">
            <button onClick={handleDownloadBackupCodes} className="btn btn-secondary">
              {t('twoFactor.downloadCodes')}
            </button>
            <button onClick={handleCopyBackupCodes} className="btn btn-secondary">
              {t('twoFactor.copyCodes')}
            </button>
            <button 
              onClick={() => setShowBackupCodes(false)} 
              className="btn btn-primary"
            >
              {t('twoFactor.savedCodes')}
            </button>
          </div>
        </div>
      )}

      {/* Main Actions - Enable/Disable 2FA */}
      {!setupMode && !showBackupCodes && (
        <div className="two-factor-actions">
          {!isEnabled ? (
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? t('common.loading') : t('twoFactor.enableButton')}
            </button>
          ) : (
            <>
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={loading}
                className="btn btn-secondary"
              >
                {t('twoFactor.regenerateBackupCodes')}
              </button>
              <button
                onClick={() => setShowDisableModal(true)}
                disabled={loading}
                className="btn btn-danger"
              >
                {t('twoFactor.disableButton')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Disable Confirmation Modal */}
      {showDisableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('twoFactor.disableConfirmTitle')}</h3>
            <p>{t('twoFactor.disableConfirmDescription')}</p>
            
            <input
              type="password"
              placeholder={t('twoFactor.enterPassword')}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="input-field"
              autoFocus
            />

            <div className="modal-actions">
              <button
                onClick={handleDisableTwoFactor}
                disabled={loading || !disablePassword}
                className="btn btn-danger"
              >
                {loading ? t('common.loading') : t('twoFactor.disableConfirm')}
              </button>
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisablePassword('');
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;

