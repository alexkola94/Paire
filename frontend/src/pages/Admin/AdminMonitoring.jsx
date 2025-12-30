import { useState, useEffect, useCallback, useRef } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCw, FiServer, FiClock, FiDatabase, FiUsers, FiCpu, FiActivity, FiWifi } from 'react-icons/fi'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr' // Import SignalR
import { sessionManager } from '../../services/sessionManager' // For auth token
import { getBackendUrl } from '../../utils/getBackendUrl'
import './Admin.css'

function AdminMonitoring() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [metrics, setMetrics] = useState(null)
    const [dbHealth, setDbHealth] = useState(null)
    const [sessions, setSessions] = useState(null)

    // Switch from "Auto-refresh" to "Live Mode"
    const [isLive, setIsLive] = useState(true)
    const [connectionStatus, setConnectionStatus] = useState('Disconnected')

    const connectionRef = useRef(null)

    const loadInitialData = useCallback(async () => {
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

    // Initial Load
    useEffect(() => {
        loadInitialData()
    }, [loadInitialData])

    // SignalR Connection
    // SignalR Connection Management
    useEffect(() => {
        let isMounted = true;
        let currentConnection = null;

        const startConnection = async () => {
            // If live mode is off, ensure we are disconnected and explicitly return
            if (!isLive) {
                setConnectionStatus('Disconnected');
                return;
            }

            setConnectionStatus('Connecting...');

            try {
                const token = sessionManager.getToken();
                const backendUrl = getBackendUrl();

                const connection = new HubConnectionBuilder()
                    .withUrl(`${backendUrl}/hubs/monitoring`, {
                        accessTokenFactory: () => token
                    })
                    .configureLogging(LogLevel.Information)
                    .withAutomaticReconnect()
                    .build();

                connection.on('ReceiveMetrics', (newMetrics) => {
                    if (isMounted) {
                        setMetrics(newMetrics);
                    }
                });

                connection.onreconnecting(() => {
                    if (isMounted) setConnectionStatus('Reconnecting...');
                });

                connection.onreconnected(() => {
                    if (isMounted) setConnectionStatus('Live');
                });

                connection.onclose(() => {
                    if (isMounted) setConnectionStatus('Disconnected');
                });

                await connection.start();

                // CRITICAL CHECK: Did the effect cleanup run while we were awaiting start()?
                if (!isMounted) {
                    console.log('Component unmounted during connection start, stopping connection...');
                    connection.stop();
                    return;
                }

                // If we are still mounted, save the connection reference
                currentConnection = connection;
                connectionRef.current = connection;
                setConnectionStatus('Live');

            } catch (err) {
                if (isMounted) {
                    console.error('SignalR Connection Error:', err);
                    setConnectionStatus('Error');
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            // Cleanup: Stop the specific connection created in this effect
            if (currentConnection) {
                currentConnection.off('ReceiveMetrics');
                currentConnection.stop();
                connectionRef.current = null;
            }
        };
    }, [isLive]);

    if (loading && !metrics) return <LogoLoader />

    const formatMs = (ms) => `${ms.toFixed(2)}ms`
    const formatMB = (mb) => `${mb.toFixed(2)} MB`
    const formatMinutes = (mins) => mins < 1 ? `${(mins * 60).toFixed(0)}s` : `${mins.toFixed(1)}m`

    return (
        <div className="admin-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>System Monitoring</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Real-time performance & health metrics</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        title={isLive ? "Disable Real-time Updates" : "Enable Real-time Updates"}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isLive ? 'var(--success)' : 'var(--bg-tertiary)',
                            color: isLive ? 'white' : 'var(--text-primary)',
                            boxShadow: isLive ? '0 2px 8px rgba(46, 204, 113, 0.3)' : 'none'
                        }}
                    >
                        <FiWifi style={{ opacity: isLive ? 1 : 0.5 }} />
                        <span>{isLive ? 'Live' : 'Go Live'}</span>
                        {isLive && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                animation: 'pulse 1.5s infinite'
                            }} />
                        )}
                    </button>

                    <button
                        className="btn-icon"
                        onClick={loadInitialData}
                        disabled={loading}
                        title="Force Refresh"
                    >
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Same UI as before, but driven by 'metrics' state which updates live */}

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

            {/* The rest of the component (Database Health, API Performance, Active Sessions) remains largely the same 
                as they are less frequently updated or require different data sources not yet in the fast loop 
            */}
            {/* Database Health */}
            {dbHealth && (
                <div className="dashboard-section mb-6">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <FiDatabase /> Database Health
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="stat-card" style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            padding: '1.5rem',
                            minHeight: '180px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</h3>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: dbHealth.status === 'Healthy' ? 'var(--success)' : 'var(--error)' }}>
                                        {dbHealth.status}
                                    </div>
                                </div>
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    backgroundColor: dbHealth.status === 'Healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: dbHealth.status === 'Healthy' ? '#10b981' : '#ef4444'
                                }}>
                                    <FiActivity style={{ fontSize: '1.5rem' }} />
                                </div>
                            </div>

                            <div style={{
                                marginTop: 'auto',
                                paddingTop: '1rem',
                                borderTop: '1px solid rgba(128, 128, 128, 0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.875rem'
                            }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection Time</span>
                                <span style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: dbHealth.connectionTimeMs < 100 ? '#10b981' : dbHealth.connectionTimeMs < 500 ? '#f59e0b' : '#ef4444'
                                }}>
                                    {formatMs(dbHealth.connectionTimeMs || 0)}
                                </span>
                            </div>
                        </div>

                        {/* Entity Counts Card */}
                        <div className="stat-card" style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            padding: '1.5rem',
                            minHeight: '180px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Entity Counts</h3>
                                <FiDatabase style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', opacity: 0.5 }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(128, 128, 128, 0.08)', border: '1px solid rgba(128, 128, 128, 0.1)' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Users</span>
                                    <strong style={{ fontSize: '1.25rem', display: 'block', color: 'var(--text-primary)' }}>{dbHealth.totalUsers?.toLocaleString() || 0}</strong>
                                </div>
                                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(128, 128, 128, 0.08)', border: '1px solid rgba(128, 128, 128, 0.1)' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Transactions</span>
                                    <strong style={{ fontSize: '1.25rem', display: 'block', color: 'var(--text-primary)' }}>{dbHealth.totalTransactions?.toLocaleString() || 0}</strong>
                                </div>
                                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(128, 128, 128, 0.08)', border: '1px solid rgba(128, 128, 128, 0.1)' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Partnerships</span>
                                    <strong style={{ fontSize: '1.25rem', display: 'block', color: 'var(--text-primary)' }}>{dbHealth.totalPartnerships?.toLocaleString() || 0}</strong>
                                </div>
                                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(128, 128, 128, 0.08)', border: '1px solid rgba(128, 128, 128, 0.1)' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Loans</span>
                                    <strong style={{ fontSize: '1.25rem', display: 'block', color: 'var(--text-primary)' }}>{dbHealth.totalLoans?.toLocaleString() || 0}</strong>
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
