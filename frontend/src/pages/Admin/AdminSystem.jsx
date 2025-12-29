import { useState, useEffect } from 'react'
import { FiRefreshCw, FiServer, FiCpu, FiGithub } from 'react-icons/fi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import packageJson from '../../../package.json'
import './AdminSystem.css'

function AdminSystem() {
    const [loading, setLoading] = useState(true)
    const [changelog, setChangelog] = useState('')
    const [systemInfo, setSystemInfo] = useState(null)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            // Fetch System Info
            const infoRes = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/system/info`)
            if (infoRes.ok) {
                const infoData = await infoRes.json()
                setSystemInfo(infoData)
            }

            // Fetch Changelog
            const changeRes = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/system/changelog`)
            if (changeRes.ok) {
                const changeData = await changeRes.json()
                setChangelog(changeData.content)
            } else {
                setChangelog('# Changelog\n\n*Unable to load changelog.*')
            }
        } catch (err) {
            console.error('Error fetching system data:', err)
            setError('Failed to load system information.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="admin-system-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">System Information</h1>
                    <p className="page-subtitle">Version history and system status</p>
                </div>
                <button
                    className="refresh-btn"
                    onClick={fetchData}
                    disabled={loading}
                    title="Refresh Data"
                >
                    <FiRefreshCw className={loading ? 'spinning' : ''} />
                </button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="system-grid">
                {/* Version Status Card */}
                <div className="system-card version-card">
                    <div className="card-header">
                        <FiCpu className="card-icon" />
                        <h3>Application Version</h3>
                    </div>
                    <div className="versions-container">
                        <div className="version-item">
                            <span className="version-label">Frontend</span>
                            <span className="version-value">v{packageJson.version}</span>
                        </div>
                        <div className="version-divider"></div>
                        <div className="version-item">
                            <span className="version-label">Backend API</span>
                            <span className="version-value">
                                {systemInfo?.version ? `v${systemInfo.version}` : 'Unknown'}
                            </span>
                        </div>
                    </div>
                    <div className="environment-info">
                        <span>Environment: {import.meta.env.MODE}</span>
                    </div>
                </div>

                {/* API Status Card */}
                <div className="system-card api-card">
                    <div className="card-header">
                        <FiServer className="card-icon" />
                        <h3>API Status</h3>
                    </div>
                    {systemInfo ? (
                        <div className="api-details">
                            <div className="detail-row">
                                <span>Name:</span>
                                <strong>{systemInfo.name}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Description:</span>
                                <span>{systemInfo.description}</span>
                            </div>
                            <div className="detail-row">
                                <span>Documentation:</span>
                                <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5038'}/swagger`} target="_blank" rel="noreferrer">
                                    Swagger UI
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="loading-placeholder">Loading API info...</div>
                    )}
                </div>
            </div>

            {/* Changelog Section */}
            <div className="changelog-section">
                <div className="changelog-header">
                    <div className="flex items-center gap-2">
                        <FiGithub className="section-icon" />
                        <h2>Changelog</h2>
                    </div>
                </div>
                <div className="changelog-content markdown-body">
                    {loading && <div className="loading-indicator">Loading changelog...</div>}
                    {!loading && (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
                            {changelog}
                        </ReactMarkdown>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminSystem
