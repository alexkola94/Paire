import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiKey, FiAlertCircle, FiCheck } from 'react-icons/fi'
import { authService } from '../../services/auth'
import LogoLoader from '../../components/LogoLoader'
import './AdminLogin.css' // Reuse styles

function AdminSignup() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        secretKey: ''
    })

    // Handle Input Changes
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (error) setError(null)
    }

    // Handle Signup Submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        try {
            // Register with the secret key included
            await authService.register({
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword, // API might expect this
                displayName: formData.displayName,
                secretKey: formData.secretKey
            })

            setSuccess('Registration successful! Please check your email to confirm your account.')

            // Redirect after a delay
            setTimeout(() => {
                navigate('/admin/login')
            }, 3000)

        } catch (err) {
            console.error('Admin signup error:', err)
            setError(err.message || 'Failed to register. Please check your inputs.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="admin-auth-container">
                <div className="admin-auth-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4ade80', fontSize: '3rem', marginBottom: '1rem' }}>
                        <FiCheck />
                    </div>
                    <h3>Registration Successful</h3>
                    <p style={{ color: '#9ca3af', marginTop: '1rem' }}>
                        {success}
                    </p>
                    <p style={{ marginTop: '2rem' }}>
                        Redirecting to login...
                    </p>
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
                    <p>Create Administrative Account</p>
                </div>

                {error && (
                    <div className="admin-auth-error">
                        <FiAlertCircle />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admin-auth-form">
                    <div className="form-group">
                        <label htmlFor="displayName">Display Name</label>
                        <input
                            type="text"
                            id="displayName"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            required
                            placeholder="Admin User"
                        />
                    </div>

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
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="secretKey" style={{ color: '#fca5a5' }}>
                            <FiKey style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Admin Secret Key
                        </label>
                        <input
                            type="password"
                            id="secretKey"
                            name="secretKey"
                            value={formData.secretKey}
                            onChange={handleChange}
                            required
                            placeholder="Enter secret key..."
                            style={{ borderColor: '#fca5a5' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="admin-auth-button"
                        disabled={loading}
                    >
                        {loading ? <LogoLoader size="small" color="white" /> : 'Register Admin'}
                    </button>
                </form>

                <div className="admin-auth-footer">
                    <p>
                        Already an admin? <button onClick={() => navigate('/admin/login')}>Login here</button>
                    </p>
                    <button className="back-link" onClick={() => navigate('/')}>
                        Back to Application
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AdminSignup
