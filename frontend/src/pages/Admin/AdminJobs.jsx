import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCw, FiClock, FiCheckCircle, FiXCircle, FiPlay, FiZap, FiAlertCircle } from 'react-icons/fi'
import './Admin.css'

function AdminJobs() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [triggeringJob, setTriggeringJob] = useState(null)

    useEffect(() => {
        loadJobs()
    }, [])

    const loadJobs = async () => {
        try {
            setLoading(true)
            const data = await adminService.getJobs()
            setJobs(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleTriggerJob = async (jobName) => {
        if (!confirm(`Run "${jobName}" now?`)) return

        try {
            setTriggeringJob(jobName)
            await adminService.triggerJob(jobName)
            await loadJobs()
        } catch (err) {
            console.error('Failed to trigger job:', err)
        } finally {
            setTriggeringJob(null)
        }
    }

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'running': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '#3b82f6' }
            case 'error': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' }
            case 'idle':
            default: return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b981' }
        }
    }

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'running': return <FiZap style={{ animation: 'pulse 1s infinite' }} />
            case 'error': return <FiXCircle />
            default: return <FiCheckCircle />
        }
    }

    return (
        <div className="admin-page">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiZap style={{ color: 'var(--primary)' }} />
                        Background Jobs
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        Manage and monitor scheduled tasks
                    </p>
                </div>
                <button
                    onClick={loadJobs}
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

            {loading && jobs.length === 0 ? (
                <LogoLoader />
            ) : (
                <>
                    {/* Jobs Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '1rem'
                    }}>
                        {jobs.map(job => {
                            const statusStyle = getStatusColor(job.status)
                            const isTriggering = triggeringJob === job.name

                            return (
                                <div
                                    key={job.name}
                                    style={{
                                        background: 'var(--glass-bg)',
                                        backdropFilter: 'var(--glass-blur)',
                                        border: 'var(--glass-border)',
                                        borderRadius: '0.75rem',
                                        boxShadow: 'var(--shadow-sm)',
                                        overflow: 'hidden',
                                        borderLeft: `4px solid ${statusStyle.border}`,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {/* Job Header */}
                                    <div style={{
                                        padding: '1rem 1.25rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: '1px solid rgba(128, 128, 128, 0.1)'
                                    }}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            margin: 0
                                        }}>
                                            {job.name}
                                        </h3>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            background: statusStyle.bg,
                                            color: statusStyle.color
                                        }}>
                                            {getStatusIcon(job.status)}
                                            {job.status}
                                        </span>
                                    </div>

                                    {/* Job Details */}
                                    <div style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                <FiClock style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>Last Run:</span>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                                                </span>
                                            </div>

                                            {job.lastResult && (
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                    <FiCheckCircle style={{ color: '#10b981', flexShrink: 0, marginTop: '0.15rem' }} />
                                                    <span style={{ color: 'var(--text-secondary)' }}>Result:</span>
                                                    <span style={{ color: 'var(--text-primary)' }}>{job.lastResult}</span>
                                                </div>
                                            )}

                                            {job.lastError && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '0.5rem',
                                                    fontSize: '0.8rem',
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    borderRadius: '0.375rem',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    <FiAlertCircle style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
                                                    <span style={{ color: '#ef4444' }}>
                                                        Error at {new Date(job.lastError).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => handleTriggerJob(job.name)}
                                            disabled={isTriggering || job.status === 'Running'}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                width: '100%',
                                                padding: '0.625rem 1rem',
                                                borderRadius: '0.5rem',
                                                border: 'none',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                cursor: isTriggering || job.status === 'Running' ? 'not-allowed' : 'pointer',
                                                background: isTriggering || job.status === 'Running'
                                                    ? 'rgba(128, 128, 128, 0.1)'
                                                    : 'var(--primary)',
                                                color: isTriggering || job.status === 'Running'
                                                    ? 'var(--text-secondary)'
                                                    : 'white',
                                                opacity: isTriggering || job.status === 'Running' ? 0.7 : 1,
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {isTriggering ? (
                                                <>
                                                    <FiRefreshCw className="spinning" />
                                                    Running...
                                                </>
                                            ) : job.status === 'Running' ? (
                                                <>
                                                    <FiZap />
                                                    In Progress
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlay />
                                                    Run Now
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {jobs.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1.5rem',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'var(--glass-blur)',
                            border: 'var(--glass-border)',
                            borderRadius: '0.75rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <FiZap style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0 }}>No background jobs configured yet.</p>
                        </div>
                    )}
                </>
            )}

            {/* Responsive Styles */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @media (max-width: 480px) {
                    .admin-page > div:nth-child(2) {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    )
}

export default AdminJobs
