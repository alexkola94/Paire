import { useState, useEffect, useCallback } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCw, FiServer, FiClock, FiDatabase, FiUsers, FiCpu, FiActivity } from 'react-icons/fi'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Admin.css'

function AdminMonitoring() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [metrics, setMetrics] = useState(null)
    const [dbHealth, setDbHealth] = useState(null)
    const [sessions, setSessions] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const loadMonitoringData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [metricsData, dbData, sessionsData] = await Promise.all([
                adminService.getPerformanceMetrics(),
                adminService.getDatabaseHealth(),
                adminService.getActiveSessions()
            ])

            setMetrics(metricsData)
            setDbHealth(dbData)
            setSessions(sessionsData)
        } catch (err) {
            console.error('Failed to load monitoring data:', err)
            setError(err.message || 'Failed to load monitoring data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadMonitoringData()
    }, [loadMonitoringData])

    useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(() => {
            loadMonitoringData()
        }, 30000) // Refresh every 30 seconds

        return () => clearInterval(interval)
    }, [autoRefresh, loadMonitoringData])

    if (loading && !metrics) return <LogoLoader />

    if (error && !metrics) {
        return (
            <div className="admin-page">
                <div className="error-banner">
                    <h3>Error Loading Monitoring Data</h3>
                    <p>{error}</p>
                    <button className="btn-primary mt-4" onClick={loadMonitoringData}>Retry</button>
                </div>
            </div>
        )
    }

    const formatMs = (ms) => `${ms.toFixed(2)}ms`
    const formatMB = (mb) => `${mb.toFixed(2)} MB`
    const formatMinutes = (mins) => mins < 1 ? `${(mins * 60).toFixed(0)}s` : `${mins.toFixed(1)}m`

    return (
        <div className="admin-page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title mb-0">System Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-2">Real-time performance & health metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        <span className="text-sm">Auto-refresh (30s)</span>
                    </label>
                    <button
                        className="btn-icon"
                        onClick={loadMonitoringData}
                        disabled={loading}
                        title="Refresh Now"
                    >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* System Stats Cards */}
            {metrics && (
                <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="stat-icon transactions">
                            <FiActivity />
                        </div>
                        <div className="stat-info">
                            <h3>Total Requests</h3>
                            <p className="stat-value">{metrics.totalRequests?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500">{metrics.trackedEndpoints || 0} endpoints</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon health">
                            <FiCpu />
                        </div>
                        <div className="stat-info">
                            <h3>Memory Usage</h3>
                            <p className="stat-value">{formatMB(metrics.memoryUsageMB || 0)}</p>
                            <p className="text-xs text-gray-500">{metrics.threadCount || 0} threads</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiClock />
                        </div>
                        <div className="stat-info">
                            <h3>Uptime</h3>
                            <p className="stat-value">{formatMinutes((metrics.uptimeSeconds || 0) / 60)}</p>
                            <p className="text-xs text-gray-500">CPU: {(metrics.cpuTimeSeconds || 0).toFixed(1)}s</p>
                        </div>
                    </div>

                    {sessions && (
                        <div className="stat-card">
                            <div className="stat-icon users">
                                <FiUsers />
                            </div>
                            <div className="stat-info">
                                <h3>Active Sessions</h3>
                                <p className="stat-value text-green">{sessions.activeSessions || 0}</p>
                                <p className="text-xs text-gray-500">of {sessions.totalSessions || 0} total</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Database Health */}
            {dbHealth && (
                <div className="dashboard-section mb-6">
                    <h2 className="flex items-center gap-2 mb-4">
                        <FiDatabase /> Database Health
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <div className="stat-card" style={{ padding: '24px' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                                    <p className={`text-3xl font-bold ${dbHealth.status === 'Healthy' ? 'text-green' : 'text-red'}`}>
                                        {dbHealth.status}
                                    </p>
                                </div>
                                <FiServer className={`text-5xl ${dbHealth.status === 'Healthy' ? 'text-green' : 'text-red'}`} style={{ opacity: 0.3 }} />
                            </div>
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <strong>Connection Time:</strong> {formatMs(dbHealth.connectionTimeMs || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Entity Counts Card */}
                        <div className="stat-card" style={{ padding: '24px' }}>
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Entity Counts</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Users</span>
                                    <strong className="text-lg">{dbHealth.totalUsers?.toLocaleString() || 0}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Transactions</span>
                                    <strong className="text-lg">{dbHealth.totalTransactions?.toLocaleString() || 0}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Partnerships</span>
                                    <strong className="text-lg">{dbHealth.totalPartnerships?.toLocaleString() || 0}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-600">Loans</span>
                                    <strong className="text-lg">{dbHealth.totalLoans?.toLocaleString() || 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Performance */}
            {metrics && metrics.endpointStats && metrics.endpointStats.length > 0 && (
                <div className="dashboard-section mb-6">
                    <h2 className="mb-4">API Performance</h2>
                    <div className="table-container" style={{ marginBottom: '30px' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Endpoint</th>
                                    <th>Requests</th>
                                    <th>Avg Response</th>
                                    <th>Min</th>
                                    <th>Max</th>
                                    <th>P95</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.endpointStats.slice(0, 10).map((stat, index) => (
                                    <tr key={index}>
                                        <td className="font-mono text-sm">{stat.endpoint}</td>
                                        <td><span className="badge badge-blue">{stat.totalRequests}</span></td>
                                        <td className="font-medium">{formatMs(stat.averageMs)}</td>
                                        <td className="text-green">{formatMs(stat.minMs)}</td>
                                        <td className="text-red">{formatMs(stat.maxMs)}</td>
                                        <td>{formatMs(stat.p95Ms)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Performance Chart */}
                    <h3 className="text-lg font-medium mb-4">Response Time Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.endpointStats.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="endpoint"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fontSize: 10 }}
                                />
                                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value) => formatMs(value)} />
                                <Legend />
                                <Bar dataKey="averageMs" fill="#6c5ce7" name="Average" />
                                <Bar dataKey="p95Ms" fill="#e17055" name="P95" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Active Sessions */}
            {sessions && sessions.sessions && sessions.sessions.length > 0 && (
                <div className="dashboard-section">
                    <h2>Recent Active Sessions</h2>
                    <div className="table-container mt-4">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Device</th>
                                    <th>IP Address</th>
                                    <th>Created</th>
                                    <th>Last Active</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.sessions.map((session, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{session.deviceInfo || 'Unknown'}</td>
                                        <td className="font-mono text-sm">{session.ipAddress}</td>
                                        <td className="text-sm">{new Date(session.createdAt).toLocaleDateString()}</td>
                                        <td className="text-sm">{new Date(session.lastAccessedAt).toLocaleString()}</td>
                                        <td>
                                            <span className="badge badge-green">{formatMinutes(session.activeMinutes)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminMonitoring
