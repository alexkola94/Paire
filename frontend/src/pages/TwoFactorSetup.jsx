import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { twoFactorService } from '../services/api'
import { authService } from '../services/auth'
import LogoLoader from '../components/LogoLoader'
import { FiSmartphone, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { useToast } from '../components/Toast'
import './Admin/AdminLogin.css' // Reuse the nice glass theme

function TwoFactorSetup() {
    const navigate = useNavigate()
    const { addToast } = useToast()

    const [step, setStep] = useState('intro') // intro, scan, verify, success
    const [setupData, setSetupData] = useState(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [backupCodes, setBackupCodes] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Check if user is logged in
        if (!authService.isAuthenticated()) {
            navigate('/login?redirect=/setup-2fa')
        }
    }, [navigate])

    const startSetup = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await twoFactorService.setup()
            setSetupData(data)
            setStep('scan')
        } catch (err) {
            console.error(err)
            setError('Failed to initialize 2FA setup. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const verifyAndEnable = async (e) => {
        e.preventDefault()
        if (verificationCode.length !== 6) return

        try {
            setLoading(true)
            setError(null)
            const data = await twoFactorService.enable(verificationCode)
            setBackupCodes(data.codes)

            // Critical: Refresh user session to update TwoFactorEnabled status
            // This ensures AdminLayout doesn't redirect back to setup
            await authService.getUser(true)

            setStep('success')
            addToast('Two-Factor Authentication enabled successfully!', 'success')
        } catch (err) {
            console.error(err)
            setError('Invalid verification code. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const finishSetup = () => {
        navigate('/admin/dashboard') // Assume admin flow for now, or check role
    }

    if (loading && step === 'intro') {
        return (
            <div className="admin-auth-container">
                <LogoLoader />
            </div>
        )
    }

    return (
        <div className="admin-auth-container">
            <div className="admin-auth-card">
                <div className="admin-auth-header">
                    <h2>Secure Your Account</h2>
                    <p>Two-Factor Authentication</p>
                </div>

                {error && (
                    <div className="admin-auth-error">
                        <FiAlertTriangle />
                        <span>{error}</span>
                    </div>
                )}

                {step === 'intro' && (
                    <div className="text-center" style={{ color: '#dfe6e9' }}>
                        <div style={{ margin: '20px 0', fontSize: '3rem', color: '#a29bfe' }}>
                            <FiShield style={{ display: 'inline-block' }} />
                        </div>
                        <p style={{ marginBottom: '24px', lineHeight: '1.6' }}>
                            Protect your account by adding an extra layer of security.
                            When you sign in, you'll need to enter a code from your authenticator app.
                        </p>
                        <button onClick={startSetup} className="admin-auth-button">
                            Get Started
                        </button>
                    </div>
                )}

                {step === 'scan' && setupData && (
                    <div className="admin-auth-form">
                        <div className="text-center" style={{ color: '#dfe6e9' }}>
                            <p style={{ marginBottom: '16px' }}>
                                1. Install an app like Google Authenticator.
                            </p>
                            <p style={{ marginBottom: '16px' }}>
                                2. Scan this QR code:
                            </p>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
                                <img src={setupData.qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#b2bec3', marginBottom: '24px' }}>
                                Can't scan? Enter manually: <br />
                                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', color: '#a29bfe', display: 'inline-block', marginTop: '8px' }}>
                                    {setupData.manualEntryKey}
                                </code>
                            </p>
                        </div>

                        <form onSubmit={verifyAndEnable}>
                            <div className="form-group">
                                <label htmlFor="code">3. Enter the 6-digit code</label>
                                <input
                                    type="text"
                                    id="code"
                                    name="code"
                                    maxLength="6"
                                    placeholder="000 000"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || verificationCode.length !== 6}
                                className="admin-auth-button"
                            >
                                {loading ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center" style={{ color: '#dfe6e9' }}>
                        <div style={{ margin: '20px 0', fontSize: '3rem', color: '#2ecc71' }}>
                            <FiCheckCircle style={{ display: 'inline-block' }} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'white' }}>2FA Enabled!</h3>
                        <p style={{ color: '#b2bec3', marginBottom: '24px' }}>
                            Save these backup codes in a safe place.
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '24px'
                        }}>
                            {backupCodes.map((code, i) => (
                                <code key={i} style={{ fontFamily: 'monospace', color: '#a29bfe', fontSize: '0.9rem' }}>{code}</code>
                            ))}
                        </div>

                        <button onClick={finishSetup} className="admin-auth-button" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                            Continue to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TwoFactorSetup
