import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiUsers, FiActivity, FiServer, FiAlertCircle } from 'react-icons/fi'
import './Admin.css'

function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            setLoading(true)
            const data = await adminService.getStats()
            setStats(data)
        } catch (err) {
            console.error(err)
            setError('Failed to load system stats. You might not have permission.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LogoLoader />
    if (error) return <div className="admin-error">{error}</div>

    return (
        <div className="admin-page">
            <h1 className="page-title">System Overview</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon users">
                        <FiUsers />
                    </div>
                    <div className="stat-info">
                        <h3>Total Users</h3>
                        <p className="stat-value">{stats.totalUsers}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon transactions">
                        <FiActivity />
                    </div>
                    <div className="stat-info">
                        <h3>Transactions</h3>
                        <p className="stat-value">{stats.totalTransactions}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon errors">
                        <FiAlertCircle />
                    </div>
                    <div className="stat-info">
                        <h3>Recent Errors (24h)</h3>
                        <p className={`stat-value ${stats.recentErrors24h > 0 ? 'text-red' : 'text-green'}`}>
                            {stats.recentErrors24h}
                        </p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon health">
                        <FiServer />
                    </div>
                    <div className="stat-info">
                        <h3>System Health</h3>
                        <p className={`stat-value ${stats.systemHealth === 'Healthy' ? 'text-green' : 'text-red'}`}>
                            {stats.systemHealth}
                        </p>
                    </div>
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Server Info</h2>
                <div className="info-card">
                    <p><strong>Server Time:</strong> {new Date(stats.serverTime).toLocaleString()}</p>
                    <p><strong>Environment:</strong> Production</p>
                    <p><strong>Version:</strong> v{stats.version || '2.0.0'}</p>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
