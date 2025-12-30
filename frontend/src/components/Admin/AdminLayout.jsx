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
    FiServer,
    FiShield
} from 'react-icons/fi'
import { authService } from '../../services/auth'
import { useTheme } from '../../context/ThemeContext'
import AdminHeader from './AdminHeader'
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
        { path: '/admin/security', icon: FiShield, label: 'Security' },
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
                    {/* Brand Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
                            alt="Paire Logo"
                            className="sidebar-logo"
                        />
                        <div className="sidebar-brand-text">
                            <h2>Paire</h2>
                            <span>Admin Portal</span>
                        </div>
                    </div>

                    {/* User Info Card */}
                    {user && (
                        <div style={{
                            background: 'rgba(142, 68, 173, 0.08)',
                            borderRadius: '0.75rem',
                            padding: '0.875rem 1rem',
                            border: '1px solid rgba(142, 68, 173, 0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #6c3483))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    flexShrink: 0
                                }}>
                                    {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {user.displayName || 'Admin User'}
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {user.email}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                    {/* Items moved to header */}
                    <div className="text-xs text-center text-gray-500 opacity-50 py-4">
                        v{import.meta.env.PACKAGE_VERSION || '1.0.0'}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <AdminHeader toggleSidebar={toggleSidebar} />
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
