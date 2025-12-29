import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCcw, FiAlertTriangle, FiInfo } from 'react-icons/fi'
import './Admin.css'

function AdminLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedLevel, setSelectedLevel] = useState('All')

    useEffect(() => {
        loadLogs()
    }, [selectedLevel])

    const loadLogs = async () => {
        try {
            setLoading(true)
            const data = await adminService.getLogs(100, selectedLevel)
            setLogs(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-page">
            <div className="responsive-header">
                <div className="flex items-center gap-4">
                    <h1 className="page-title mb-0">Recent Errors & Logs</h1>
                    <button className="btn-icon" onClick={loadLogs} title="Refresh">
                        <FiRefreshCcw />
                    </button>
                </div>

                <div className="flex items-center gap-2" style={{ justifyContent: 'space-between' }}>
                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Filter Level:</span>
                    <select
                        className="form-select text-sm py-1 px-3 border-gray-300 rounded-md"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        style={{ minWidth: '140px' }}
                    >
                        <option value="All">All Levels</option>
                        <option value="Error">Error Only</option>
                        <option value="Warning">Warning Only</option>
                        <option value="Info">Info Only</option>
                    </select>
                </div>
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
                                    <td style={{ maxWidth: '300px' }}>
                                        <div className="font-medium break-all">{log.message}</div>
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
