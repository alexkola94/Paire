import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCcw, FiAlertTriangle, FiInfo } from 'react-icons/fi'
import './Admin.css'

function AdminLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        try {
            setLoading(true)
            const data = await adminService.getLogs(100)
            setLogs(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-page">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="page-title mb-0">Recent Errors & Logs</h1>
                <button className="btn-icon" onClick={loadLogs} title="Refresh">
                    <FiRefreshCcw />
                </button>
            </div>

            {loading ? (
                <LogoLoader />
            ) : (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Level</th>
                                <th>Message</th>
                                <th>Time & Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>
                                        {log.level === 'Error' ? (
                                            <span className="text-red"><FiAlertTriangle /></span>
                                        ) : (
                                            <span className="text-blue"><FiInfo /></span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="font-medium">{log.message}</div>
                                        {log.stackTrace && (
                                            <details className="mt-1">
                                                <summary className="details-summary">View Stack Trace</summary>
                                                <pre className="stack-trace">
                                                    {log.stackTrace}
                                                </pre>
                                            </details>
                                        )}
                                    </td>
                                    <td>
                                        <div className="text-sm text-secondary">{new Date(log.timestamp).toLocaleString()}</div>
                                        <div className="text-xs text-secondary opacity-75 font-mono mt-1">{log.source || 'System'}</div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="text-center py-8 text-gray-500">
                                        No logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default AdminLogs
