import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCcw, FiClock, FiCheckCircle, FiXCircle, FiPlay } from 'react-icons/fi'
import './Admin.css'

function AdminJobs() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)

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

    return (
        <div className="admin-page">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="page-title mb-0">Background Jobs</h1>
                <button className="btn-icon" onClick={loadJobs} title="Refresh">
                    <FiRefreshCcw />
                </button>
            </div>

            {loading ? (
                <LogoLoader />
            ) : (
                <div className="jobs-grid">
                    {jobs.map(job => (
                        <div key={job.name} className={`job-card status-${job.status.toLowerCase()}`}>
                            <div className="job-header">
                                <h2 className="job-name">{job.name}</h2>
                                <span className={`badge badge-${job.status === 'Error' ? 'red' : job.status === 'Running' ? 'blue' : 'green'}`}>
                                    {job.status}
                                </span>
                            </div>

                            <div className="job-details">
                                <p>Last Run: <span>{new Date(job.lastRun).toLocaleString()}</span></p>
                                {job.lastResult && (
                                    <p>Last Result: <span>{job.lastResult}</span></p>
                                )}
                                {job.lastError && (
                                    <p className="text-red-600 text-sm mt-2">
                                        <FiXCircle className="inline mr-1" />
                                        Error at {new Date(job.lastError).toLocaleString()}
                                    </p>
                                )}
                                <div className="mt-4 flex justify-end">
                                    <button
                                        className="action-btn"
                                        style={{ border: '1px solid var(--glass-border)', padding: '0.4rem 1rem', width: 'auto', gap: '8px' }}
                                        onClick={async () => {
                                            if (confirm(`Run ${job.name} now?`)) {
                                                await adminService.triggerJob(job.name);
                                                loadJobs();
                                            }
                                        }}
                                        title="Run Job Now"
                                    >
                                        <FiPlay size={14} /> Run Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {jobs.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500 card glass-card">
                            No active background jobs reported yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default AdminJobs
