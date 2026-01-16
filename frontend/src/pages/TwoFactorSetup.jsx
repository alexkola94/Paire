import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { twoFactorService } from '../services/api'
import { authService } from '../services/auth'
import LogoLoader from '../components/LogoLoader'
import { FiSmartphone, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { useToast } from '../components/Toast'
import './TwoFactorSetup.css'

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

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    }

    return (
        <div className="admin-auth-container">
            <motion.div 
                className="admin-auth-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
                <motion.div 
                    className="admin-auth-header"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <h2>Secure Your Account</h2>
                    <p>Two-Factor Authentication</p>
                </motion.div>

                {error && (
                    <motion.div 
                        className="admin-auth-error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <FiAlertTriangle />
                        <span>{error}</span>
                    </motion.div>
                )}

                {step === 'intro' && (
                    <motion.div 
                        className="text-center"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div 
                            style={{ margin: '20px 0', fontSize: '3rem' }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <FiShield style={{ display: 'inline-block' }} />
                        </motion.div>
                        <p style={{ marginBottom: '24px', lineHeight: '1.6' }}>
                            Protect your account by adding an extra layer of security.
                            When you sign in, you'll need to enter a code from your authenticator app.
                        </p>
                        <motion.button 
                            onClick={startSetup} 
                            className="admin-auth-button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Get Started
                        </motion.button>
                    </motion.div>
                )}

                {step === 'scan' && setupData && (
                    <motion.div 
                        className="admin-auth-form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <motion.div 
                            className="text-center"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <p style={{ marginBottom: '16px' }}>
                                1. Install an app like Google Authenticator.
                            </p>
                            <p style={{ marginBottom: '16px' }}>
                                2. Scan this QR code:
                            </p>
                            <motion.div 
                                style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                <img src={setupData.qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                            </motion.div>
                            <p style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
                                Can't scan? Enter manually: <br />
                                <code>
                                    {setupData.manualEntryKey}
                                </code>
                            </p>
                        </motion.div>

                        <motion.form 
                            onSubmit={verifyAndEnable}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
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
                                    autoComplete="off"
                                />
                            </div>
                            <motion.button
                                type="submit"
                                disabled={loading || verificationCode.length !== 6}
                                className="admin-auth-button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? 'Verifying...' : 'Verify & Enable'}
                            </motion.button>
                        </motion.form>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div 
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <motion.div 
                            style={{ margin: '20px 0', fontSize: '3rem' }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <FiCheckCircle style={{ display: 'inline-block' }} />
                        </motion.div>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>2FA Enabled!</h3>
                        <p style={{ marginBottom: '24px' }}>
                            Save these backup codes in a safe place.
                        </p>

                        <motion.div 
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '24px'
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.5 }}
                        >
                            {backupCodes.map((code, i) => (
                                <motion.code 
                                    key={i} 
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
                                >
                                    {code}
                                </motion.code>
                            ))}
                        </motion.div>

                        <motion.button 
                            onClick={finishSetup} 
                            className="admin-auth-button"
                            style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Continue to Dashboard
                        </motion.button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}

export default TwoFactorSetup
