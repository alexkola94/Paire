import { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import { authService } from '../../services/auth'
import LogoLoader from '../../components/LogoLoader'
import { FiRefreshCcw, FiLock, FiUnlock, FiShieldOff } from 'react-icons/fi'
import Pagination from '../../components/Pagination'
import ConfirmationModal from '../../components/ConfirmationModal'
import './Admin.css'

function AdminUsers() {
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [currentUser, setCurrentUser] = useState(null)

    // Modal state
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: null, // 'lock', 'unlock', 'reset2fa'
        user: null,
        title: '',
        message: '',
        variant: 'danger'
    })
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        // Get current user to exclude from list
        const user = authService.getCurrentUser()
        setCurrentUser(user)
        loadUsers()
    }, [])

    // Reset page when search changes
    useEffect(() => {
        setPage(1)
    }, [search])

    const loadUsers = async () => {
        try {
            setLoading(true)
            // Fetch all users (limit 10000 for local search)
            const data = await adminService.getUsers(1, 10000, '')
            setAllUsers(data.items)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const openActionModal = (type, user) => {
        let config = {
            isOpen: true,
            type,
            user,
            variant: 'danger'
        }

        switch (type) {
            case 'lock':
                config.title = 'Lock User Account'
                config.message = `Are you sure you want to lock ${user.email}? They will be unable to log in until unlocked.`
                break
            case 'unlock':
                config.title = 'Unlock User Account'
                config.message = `Are you sure you want to unlock ${user.email}? They will be able to log in again.`
                config.variant = 'warning' // or success if supported, but usually warning/danger for modals
                break
            case 'reset2fa':
                config.title = 'Reset 2FA'
                config.message = `Are you sure you want to reset 2FA for ${user.email}? They will need to set up Two-Factor Authentication again on their next login.`
                config.variant = 'warning'
                break
            default:
                break
        }
        setModalConfig(config)
    }

    const closeActionModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
    }

    const handleConfirmAction = async () => {
        const { type, user } = modalConfig
        if (!type || !user) return

        try {
            setActionLoading(true)

            if (type === 'lock') {
                await adminService.lockUser(user.id)
            } else if (type === 'unlock') {
                await adminService.unlockUser(user.id)
            } else if (type === 'reset2fa') {
                await adminService.resetTwoFactor(user.id)
            }

            closeActionModal()
            loadUsers()
        } catch (error) {
            console.error(error)
            alert('Action failed: ' + error.message)
        } finally {
            setActionLoading(false)
        }
    }

    // Filter and Pagination Logic
    const filteredUsers = allUsers.filter(user => {
        // Exclude current user
        if (currentUser && user.id === currentUser.id) return false

        // Search filter
        if (!search) return true
        const searchLower = search.toLowerCase()
        return (
            user.email?.toLowerCase().includes(searchLower) ||
            user.displayName?.toLowerCase().includes(searchLower) ||
            user.id?.toLowerCase().includes(searchLower)
        )
    })

    const pageSize = 20
    const totalItems = filteredUsers.length
    const totalPages = Math.ceil(totalItems / pageSize)
    const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

    return (
        <div className="admin-page">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="page-title mb-0">User Lookup</h1>
                <button className="btn-icon" onClick={loadUsers} title="Refresh">
                    <FiRefreshCcw />
                </button>
            </div>

            <div className="search-container">
                <div className="search-wrapper">
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <LogoLoader />
            ) : (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Joined</th>
                                <th>Status</th>
                                <th style={{ width: '100px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="font-medium text-gray-900">{user.email}</div>
                                        <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                                    </td>
                                    <td>{user.displayName || '-'}</td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {user.emailConfirmed ? (
                                            <span className="badge badge-green">Verified</span>
                                        ) : (
                                            <span className="badge badge-gray">Pending</span>
                                        )}
                                        {user.lockoutEnd && new Date(user.lockoutEnd) > new Date() && (
                                            <span className="badge badge-red ml-2">Locked</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex">
                                            {user.lockoutEnd && new Date(user.lockoutEnd) > new Date() ? (
                                                <button
                                                    className="action-btn success"
                                                    title="Unlock User"
                                                    onClick={() => openActionModal('unlock', user)}
                                                >
                                                    <FiUnlock />
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-btn danger"
                                                    title="Lock User"
                                                    onClick={() => openActionModal('lock', user)}
                                                >
                                                    <FiLock />
                                                </button>
                                            )}

                                            <button
                                                className="action-btn"
                                                title="Reset 2FA"
                                                onClick={() => openActionModal('reset2fa', user)}
                                            >
                                                <FiShieldOff />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination controls */}
            {!loading && totalItems > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                />
            )}

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={closeActionModal}
                onConfirm={handleConfirmAction}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant}
                loading={actionLoading}
            />
        </div>
    )
}

export default AdminUsers
