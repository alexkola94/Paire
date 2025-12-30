import { useState, useEffect, useCallback } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiShield, FiAlertTriangle, FiSearch, FiCalendar, FiUser, FiActivity, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './Admin.css'

function AdminSecurity() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [logs, setLogs] = useState([])
    const [alerts, setAlerts] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        startDate: '',
        endDate: ''
    })

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [logsData, alertsData] = await Promise.all([
                adminService.getAuditLogs(filters, page),
                adminService.getSecurityAlerts()
            ])

            setLogs(logsData.logs || [])
            setTotalCount(logsData.totalCount || 0)
            setTotalPages(logsData.totalPages || 1)
            setAlerts(alertsData || [])
        } catch (err) {
            console.error('Failed to load security data:', err)
            setError(err.message || 'Failed to load security data')
        } finally {
            setLoading(false)
        }
    }, [page, filters])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleFilterChange = (e) => {
        const { name, value } = e.target
        setFilters(prev => ({
            ...prev,
            [name]: value
        }))
        setPage(1)
    }

    const clearFilters = () => {
        setFilters({ userId: '', action: '', startDate: '', endDate: '' })
        setPage(1)
    }

    const getSeverityBadge = (severity) => {
        const styles = {
            critical: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
            warning: { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            info: { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }
        }
        const style = styles[severity?.toLowerCase()] || { background: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' }
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
                ...style
            }}>
                {severity || 'Unknown'}
            </span>
        )
    }

    if (loading && logs.length === 0) return <LogoLoader />

    const inputStyle = {
        padding: '0.625rem 0.875rem',
        paddingLeft: '2.5rem',
        border: '1px solid rgba(128, 128, 128, 0.2)',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        width: '100%',
        transition: 'all 0.2s ease'
    }

    const dateInputStyle = {
        ...inputStyle,
        paddingLeft: '0.875rem'
    }

    const labelStyle = {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '0.375rem',
        display: 'block',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    }

    return (
        <div className="admin-page">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiShield style={{ color: 'var(--primary)' }} />
                        Security Audit
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        Track user activity and security events
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(128, 128, 128, 0.2)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <FiRefreshCw className={loading ? 'spinning' : ''} />
                    Refresh
                </button>
            </div>

            {/* Security Alerts */}
            {alerts.length > 0 && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.75rem' }}>
                        <FiAlertTriangle /> Active Security Alerts ({alerts.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {alerts.map((alert, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.625rem 0.75rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '0.5rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                <span style={{ color: '#dc2626', fontWeight: 500, fontSize: '0.875rem' }}>{alert.message}</span>
                                <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{new Date(alert.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters Card */}
            <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: 'var(--glass-border)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiSearch style={{ opacity: 0.6 }} /> Filter Logs
                    </h3>
                    {(filters.userId || filters.action || filters.startDate || filters.endDate) && (
                        <button
                            onClick={clearFilters}
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--primary)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem'
                            }}
                        >
                            Clear All
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>User ID</label>
                        <div style={{ position: 'relative' }}>
                            <FiUser style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: '1rem' }} />
                            <input
                                type="text"
                                name="userId"
                                value={filters.userId}
                                onChange={handleFilterChange}
                                placeholder="Search user..."
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Action</label>
                        <div style={{ position: 'relative' }}>
                            <FiActivity style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', fontSize: '1rem' }} />
                            <input
                                type="text"
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                                placeholder="e.g. UserLocked"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>From Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            style={dateInputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>To Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            style={dateInputStyle}
                        />
                    </div>
                </div>
            </div>

            {/* Logs - Responsive: Cards on mobile, Table on desktop */}
            <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: 'var(--glass-border)',
                borderRadius: '0.75rem',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(128, 128, 128, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Audit Logs
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                            ({totalCount} total)
                        </span>
                    </h3>
                </div>

                {/* Desktop Table View */}
                <div className="table-container desktop-only" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Severity</th>
                                <th>Action</th>
                                <th>User</th>
                                <th>Entity</th>
                                <th>Details</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td>{getSeverityBadge(log.severity)}</td>
                                        <td style={{ fontWeight: 500 }}>{log.action}</td>
                                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }} title={log.userId}>
                                            {log.userId ? log.userId.substring(0, 8) + '...' : 'System'}
                                        </td>
                                        <td style={{ fontSize: '0.8rem' }}>
                                            {log.entityType && (
                                                <span style={{
                                                    background: 'rgba(128, 128, 128, 0.1)',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500
                                                }}>
                                                    {log.entityType}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                                            {log.details || '-'}
                                        </td>
                                        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-light)' }}>{log.ipAddress || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No audit logs found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-only" style={{ padding: '0.75rem' }}>
                    {logs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {logs.map((log) => (
                                <div key={log.id} style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid rgba(128, 128, 128, 0.1)',
                                    borderRadius: '0.5rem',
                                    padding: '0.875rem',
                                    borderLeft: `3px solid ${log.severity?.toLowerCase() === 'critical' ? '#ef4444' : log.severity?.toLowerCase() === 'warning' ? '#f59e0b' : '#3b82f6'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{log.action}</span>
                                        {getSeverityBadge(log.severity)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                    {log.details && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '0.5rem 0', lineHeight: 1.4 }}>
                                            {log.details}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {log.userId && (
                                            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: 'rgba(128,128,128,0.1)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                                                User: {log.userId.substring(0, 8)}...
                                            </span>
                                        )}
                                        {log.entityType && (
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(128,128,128,0.1)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                                                {log.entityType}
                                            </span>
                                        )}
                                        {log.ipAddress && (
                                            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-light)' }}>
                                                IP: {log.ipAddress}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No audit logs found.
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(128, 128, 128, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '0.375rem',
                                border: '1px solid rgba(128, 128, 128, 0.2)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.5 : 1
                            }}
                        >
                            <FiChevronLeft />
                        </button>
                        <span style={{ padding: '0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '0.375rem',
                                border: '1px solid rgba(128, 128, 128, 0.2)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                opacity: page === totalPages ? 0.5 : 1
                            }}
                        >
                            <FiChevronRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Responsive CSS */}
            <style>{`
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: block !important; }
                }
                @media (min-width: 769px) {
                    .desktop-only { display: block !important; }
                    .mobile-only { display: none !important; }
                }
                
                /* Date input calendar icon visibility */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 0.6;
                }
                input[type="date"]::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
                [data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
            `}</style>
        </div>
    )
}

export default AdminSecurity
