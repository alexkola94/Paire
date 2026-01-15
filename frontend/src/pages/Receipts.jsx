import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrash2, FiSearch, FiZoomIn, FiDownload, FiX, FiFileText } from 'react-icons/fi'
import { transactionService, recurringBillService } from '../services/api'
import { ALL_CATEGORIES } from '../constants/categories'
import { format, startOfDay, endOfDay } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
import SearchInput from '../components/SearchInput'
import DatePicker from '../components/DatePicker'
import Skeleton from '../components/Skeleton'
import useToast from '../hooks/useToast'
import ToastContainer from '../components/ToastContainer'
import './Expenses.css' // Reuse expenses styling for grid/cards
import './Receipts.css' // Specific styling

function Receipts() {
    const { t } = useTranslation()
    const [allReceipts, setAllReceipts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, receipt: null })
    const [viewModal, setViewModal] = useState(null) // For viewing full image

    const { toasts, success: showSuccess, error: showError, removeToast } = useToast()

    // Use categories from constants
    const categories = ['All', ...ALL_CATEGORIES]

    useEffect(() => {
        loadReceipts()
    }, [])

    const loadReceipts = async () => {
        try {
            setLoading(true)
            const [transactions, recurringBills] = await Promise.all([
                transactionService.getReceipts({
                    category: null,
                    search: ''
                }),
                recurringBillService.getAll()
            ])

            // Map transactions
            const txReceipts = transactions.map(t => ({
                ...t,
                type: 'transaction',
                uniqueId: `tx-${t.id}`
            }))

            // Map recurring bill attachments
            let billAttachments = []
            if (recurringBills && Array.isArray(recurringBills)) {
                recurringBills.forEach(bill => {
                    if (bill.attachments && bill.attachments.length > 0) {
                        bill.attachments.forEach(att => {
                            billAttachments.push({
                                id: att.id,
                                type: 'recurring',
                                billId: bill.id,
                                uniqueId: `rec-${att.id}`,
                                attachmentUrl: att.fileUrl,
                                amount: bill.amount,
                                category: bill.category,
                                description: `${bill.name} - ${att.fileName}`,
                                date: att.uploadedAt || bill.createdAt,
                                user_profiles: bill.user_profiles,
                                notes: bill.notes,
                                name: bill.name
                            })
                        })
                    }
                })
            }

            // Merge and sort by date descending
            const mergedReceipts = [...txReceipts, ...billAttachments].sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            )

            setAllReceipts(mergedReceipts)
        } catch (error) {
            console.error('Error loading receipts:', error)
            showError(t('receipts.loadError', 'Failed to load receipts'))
        } finally {
            setLoading(false)
        }
    }

    // Filter receipts locally
    const filteredReceipts = useMemo(() => {
        return allReceipts.filter(receipt => {
            // Category filter
            if (selectedCategory !== 'All' && receipt.category !== selectedCategory) {
                return false
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const description = (receipt.description || '').toLowerCase()
                const notes = (receipt.notes || '').toLowerCase()
                const name = (receipt.name || '').toLowerCase() // For recurring bills

                if (!description.includes(query) && !notes.includes(query) && !name.includes(query)) {
                    return false
                }
            }

            // Date Range filter
            if (startDate || endDate) {
                const receiptDate = new Date(receipt.date)
                if (startDate && receiptDate < startOfDay(startDate)) return false
                if (endDate && receiptDate > endOfDay(endDate)) return false
            }

            return true
        })
    }, [allReceipts, selectedCategory, searchQuery, startDate, endDate])

    const handleDelete = async () => {
        const { receipt } = deleteModal
        if (!receipt) return

        try {
            if (receipt.type === 'recurring') {
                await recurringBillService.deleteAttachment(receipt.billId, receipt.id)
            } else {
                await transactionService.deleteReceipt(receipt.id)
            }

            showSuccess(t('receipts.deleteSuccess', 'Receipt deleted successfully'))
            setAllReceipts(prev => prev.filter(r => r.uniqueId !== receipt.uniqueId))
            closeDeleteModal()
        } catch (error) {
            console.error('Error deleting receipt:', error)
            showError(t('receipts.deleteError', 'Failed to delete receipt'))
        }
    }

    const openDeleteModal = (receipt) => {
        setDeleteModal({ isOpen: true, receipt })
    }

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, receipt: null })
    }

    return (
        <div className="receipts-page expenses-page">
            <div className="page-header">
                <h1>{t('receipts.title', 'Receipts Gallery')}</h1>
                <p className="page-subtitle">
                    {t('receipts.subtitle', 'View and manage your transaction receipts')}
                </p>
            </div>

            {/* Filters - Grid Layout */}
            <div className="receipts-filters-grid">
                <div className="search-span-full">
                    <SearchInput
                        onSearch={setSearchQuery}
                        placeholder={t('receipts.searchPlaceholder')}
                    />
                </div>

                <div className="filter-item">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="form-control w-full"
                        aria-label={t('common.filter')}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'All' ? t('common.viewAll', 'View All') : t(`categories.${cat.toLowerCase()}`, cat)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        placeholder={t('common.startDate')}
                        className="form-control w-full"
                    />
                </div>

                <div className="filter-item">
                    <DatePicker
                        selected={endDate}
                        onChange={setEndDate}
                        placeholder={t('common.endDate')}
                        className="form-control w-full"
                    />
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Grid */}
            {loading ? (
                <div className="receipts-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="card receipt-card">
                            <Skeleton height="200px" width="100%" />
                            <div className="receipt-content">
                                <Skeleton height="20px" width="80%" />
                                <Skeleton height="16px" width="50%" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredReceipts.length === 0 ? (
                <div className="empty-state card">
                    <p>{t('receipts.noReceipts', 'No receipts found.')}</p>
                </div>
            ) : (
                <div className="receipts-grid">
                    {filteredReceipts.map(receipt => (
                        <div key={receipt.id} className="card receipt-card">
                            <div className="receipt-image-container" onClick={() => setViewModal(receipt)}>
                                {receipt.attachmentUrl && receipt.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                                    <div className="pdf-placeholder">
                                        <div className="pdf-icon-wrapper">
                                            <FiFileText size={48} />
                                        </div>
                                        <span className="pdf-label">PDF</span>
                                        <span className="pdf-hint">{t('receipts.clickToView', 'Click to view')}</span>
                                    </div>
                                ) : (
                                    <img src={receipt.attachmentUrl} alt={t('transaction.receipt')} className="receipt-image" loading="lazy" />
                                )}
                                <div className="receipt-overlay">
                                    <FiZoomIn aria-hidden="true" />
                                </div>
                            </div>

                            <div className="receipt-content">
                                <div className="flex-between mb-2">
                                    <span className="badge category-badge">
                                        {t(`categories.${(receipt.category || '').toLowerCase()}`, receipt.category)}
                                    </span>
                                    <span className="amount font-bold">
                                        {/* Add currency formatter if needed, reusing hook later if desired */}
                                        {receipt.amount ? `€${receipt.amount}` : ''}
                                    </span>
                                </div>

                                <h3 className="text-sm font-medium truncate" title={receipt.description}>
                                    {receipt.description || t('transaction.noDescription', 'No description')}
                                </h3>

                                <div className="receipt-meta text-xs text-muted mt-2">
                                    <div>{format(new Date(receipt.date), 'MMM dd, yyyy')}</div>
                                    {receipt.user_profiles && (
                                        <div className="uploaded-by" style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                            {(receipt.user_profiles.avatar_url || receipt.user_profiles.avatarUrl) && (
                                                <img
                                                    src={receipt.user_profiles.avatar_url || receipt.user_profiles.avatarUrl}
                                                    alt={receipt.user_profiles.display_name}
                                                    className="tag-avatar"
                                                    style={{ width: '16px', height: '16px', borderRadius: '50%', marginRight: '6px', objectFit: 'cover' }}
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                            {t('dashboard.addedBy')} {receipt.user_profiles.display_name}
                                        </div>
                                    )}
                                </div>

                                <div className="receipt-actions mt-3 flex justify-end">
                                    <button
                                        className="btn-icon delete"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openDeleteModal(receipt)
                                        }}
                                        title={t('common.delete')}
                                        aria-label={t('receipts.deleteTitle')}
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
                title={t('receipts.deleteTitle', 'Delete Receipt')}
                message={t('receipts.deleteMessage', 'Are you sure you want to delete this receipt? The transaction will remain.')}
                confirmText={t('common.delete')}
                variant="danger"
            />

            {viewModal && (
                <div className="image-viewer-modal" onClick={() => setViewModal(null)} role="dialog" aria-modal="true">
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{t('receipts.viewReceipt', 'View Receipt')}</h3>
                            <button className="btn-close" onClick={() => setViewModal(null)} aria-label={t('common.close')}>
                                <FiX size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {viewModal.attachmentUrl && viewModal.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="pdf-viewer-container">
                                    <iframe 
                                        src={viewModal.attachmentUrl} 
                                        title="Receipt PDF"
                                        className="pdf-viewer-iframe"
                                    />
                                    <div className="pdf-viewer-info">
                                        <FiFileText size={20} />
                                        <span>{t('receipts.pdfDocument', 'PDF Document')}</span>
                                    </div>
                                </div>
                            ) : (
                                <img src={viewModal.attachmentUrl} alt="Full Receipt" className="modal-receipt-image" />
                            )}
                        </div>
                        <div className="modal-footer">
                            <a href={viewModal.attachmentUrl} download target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                <FiDownload style={{ marginRight: '8px' }} /> {t('common.download', 'Download')}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Receipts
