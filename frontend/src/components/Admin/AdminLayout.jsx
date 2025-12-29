import { useState, useCallback, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    FiHome,
    FiUsers,
    FiActivity,
    FiCpu,
    FiMenu,
    FiX,
    FiLogOut,
    FiMoon,
    FiSun,
    FiServer
} from 'react-icons/fi'
import { authService } from '../../services/auth'
import { useTheme } from '../../context/ThemeContext'
import './AdminLayout.css'

function AdminLayout() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [checking2FA, setChecking2FA] = useState(true)

    const [user] = useState(() => authService.getCurrentUser());

    // Dynamic Title
    useEffect(() => {
        const originalTitle = document.title;
        document.title = 'Paire Admin Portal';

        return () => {
            document.title = originalTitle;
        };
    }, []);

    useEffect(() => {
        const checkAdminStatus = async () => {
            // Check if user has admin role - if backend doesn't send roles yet, we assume safe to proceed (backend will 403 anyway)
            // But if roles ARE present, we enforce logic.
            const isAdmin = user?.roles?.includes('Admin')

            if (isAdmin && !user?.twoFactorEnabled) {
                // Force redirect to setup 2FA
                navigate('/setup-2fa')
            } else {
                setChecking2FA(false)
            }
        }
        checkAdminStatus()
    }, [navigate, user])

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const closeSidebar = () => setSidebarOpen(false)

    const handleLogout = useCallback(async () => {
        try {
            await authService.signOut()
            window.location.reload()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }, [])

    const navItems = [
        { path: '/admin/dashboard', icon: FiHome, label: 'Overview' },
        { path: '/admin/monitoring', icon: FiActivity, label: 'Monitoring' },
        { path: '/admin/users', icon: FiUsers, label: 'User Lookup' },
        { path: '/admin/logs', icon: FiActivity, label: 'System Logs' },
        { path: '/admin/jobs', icon: FiCpu, label: 'Background Jobs' },
        { path: '/admin/system', icon: FiServer, label: 'System Info' },
    ]

    if (checking2FA) return null

    return (
        <div className="admin-layout">
            {/* Mobile Header */}
            <header className="admin-mobile-header">
                <button className="menu-toggle" onClick={toggleSidebar}>
                    {sidebarOpen ? <FiX /> : <FiMenu />}
                </button>
                <div className="flex items-center gap-2">
                    <img
                        src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                        alt="Paire"
                        style={{ height: '28px' }}
                    />
                    <span className="admin-brand">Admin</span>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img
                        src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                        alt="Paire Logo"
                        className="sidebar-logo"
                    />
                    <div className="sidebar-brand-text">
                        <h2>Paire</h2>
                        <span>Admin Portal</span>
                        {authService.getCurrentUser() && (
                            <div className="sidebar-user-info">
                                <span className="user-email" title={authService.getCurrentUser().email}>
                                    {authService.getCurrentUser().email}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={closeSidebar}
                        >
                            <item.icon className="nav-icon" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? <FiMoon className="nav-icon" /> : <FiSun className="nav-icon" />}
                        <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <button className="nav-item back-app" onClick={() => navigate('/dashboard')}>
                        <span>Back to App</span>
                    </button>

                    <button className="nav-item logout" onClick={handleLogout}>
                        <FiLogOut className="nav-icon" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-content-container">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar}></div>
            )}
        </div>
    )
}

export default AdminLayout
