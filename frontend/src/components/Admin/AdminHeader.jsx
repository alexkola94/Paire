import { FiMoon, FiSun, FiLogOut, FiArrowLeft } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { authService } from '../../services/auth'
import './AdminHeader.css'

function AdminHeader({ toggleSidebar }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()

    const handleLogout = async () => {
        try {
            await authService.signOut()
            window.location.reload()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <header className="admin-header">
            <div className="admin-header-left">
                {/* Burger menu for mobile only (handled by layout currently, but could be moved here) */}
                <h2 className="admin-page-title-mobile">Admin Portal</h2>
            </div>

            <div className="admin-header-actions">
                <button
                    className="header-action-btn theme-toggle"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <FiMoon /> : <FiSun />}
                </button>

                <button
                    className="header-action-btn back-btn"
                    onClick={() => navigate('/dashboard')}
                    title="Back to App"
                >
                    <FiArrowLeft />
                    <span className="btn-label">Back to App</span>
                </button>

                <button
                    className="header-action-btn logout-btn"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <FiLogOut />
                    <span className="btn-label">Logout</span>
                </button>
            </div>
        </header>
    )
}

export default AdminHeader
