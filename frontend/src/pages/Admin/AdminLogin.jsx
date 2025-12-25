import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLock, FiAlertCircle } from 'react-icons/fi'
import { authService } from '../../services/auth'
import { sessionManager } from '../../services/sessionManager'
import LogoLoader from '../../components/LogoLoader'
import TwoFactorVerification from '../../components/TwoFactorVerification'
import './AdminLogin.css'

function AdminLogin() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    // 2FA State
    const [requires2FA, setRequires2FA] = useState(false)
    const [tempToken, setTempToken] = useState('')

    // Handle Input Changes
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error when user types
        if (error) setError(null)
    }

    // Handle Login Submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await authService.signIn(formData.email, formData.password)

            // If 2FA is required, show verification component
            if (response && response.requiresTwoFactor) {
                setTempToken(response.tempToken)
                setRequires2FA(true)
                return
            }

            // Check if user is actually an admin
            await checkAdminAccess()

        } catch (err) {
            console.error('Admin login error:', err)
            setError(err.message || 'Failed to login. Please check your credentials.')
            setLoading(false)
        }
    }

    const checkAdminAccess = async () => {
        const currentUser = authService.getCurrentUser()
        if (currentUser?.roles?.includes('Admin')) {
            // Broadcast session invalidation to other tabs if same user
            const sessionUser = sessionManager.getCurrentUser()
            if (sessionUser) {
                window.dispatchEvent(new CustomEvent('auth-storage-change'))
            }
            navigate('/admin/dashboard')
        } else {
            // valid user but not admin
            setError('Access Denied. You do not have administrator privileges.')
            // Optionally logout to prevent session sticking
            await authService.signOut()
            setLoading(false)
        }
    }

    // Handle 2FA Success
    const handle2FASuccess = async () => {
        try {
            // Wait a moment for session storage to update
            await new Promise(resolve => setTimeout(resolve, 100))
            await checkAdminAccess()
        } catch (err) {
            console.error('2FA Success Handler Error:', err)
            setError('Failed to verify admin privileges.')
        }
    }

    const handle2FACancel = () => {
        setRequires2FA(false)
        setTempToken('')
        setLoading(false)
    }

    // Render 2FA View
    if (requires2FA) {
        return (
            <div className="admin-auth-container">
                <div className="admin-auth-card">
                    <TwoFactorVerification
                        email={formData.email}
                        tempToken={tempToken}
                        onSuccess={handle2FASuccess}
                        onCancel={handle2FACancel}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="admin-auth-container">
            <div className="admin-auth-card">
                <div className="admin-auth-header">
                    <img
                        src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                        alt="Paire Logo"
                        className="admin-logo"
                        style={{ width: '64px', height: '64px', marginBottom: '1.5rem' }}
                    />
                    <h2>Admin Access</h2>
                    <p>Restricted Area</p>
                </div>

                {error && (
                    <div className="admin-auth-error">
                        <FiAlertCircle />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admin-auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="admin@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            <FiLock className="input-icon" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="admin-auth-button"
                        disabled={loading}
                    >
                        {loading ? <LogoLoader size="small" color="white" /> : 'Login to Console'}
                    </button>
                </form>

                <div className="admin-auth-footer">
                    <p>
                        Need access? <button onClick={() => navigate('/admin/signup')}>Register as Admin</button>
                    </p>
                    <button className="back-link" onClick={() => navigate('/')}>
                        Back to Application
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AdminLogin
