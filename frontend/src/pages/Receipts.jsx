import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrash2, FiSearch, FiZoomIn, FiDownload } from 'react-icons/fi'
import { transactionService } from '../services/api'
import { ALL_CATEGORIES } from '../constants/categories'
import { format } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
import SearchInput from '../components/SearchInput'
import Skeleton from '../components/Skeleton'
import useToast from '../hooks/useToast'
import ToastContainer from '../components/ToastContainer'
import './Expenses.css' // Reuse expenses styling for grid/cards
import './Receipts.css' // Specific styling

function Receipts() {
    const { t } = useTranslation()
    const [receipts, setReceipts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, receipt: null })
    const [viewModal, setViewModal] = useState(null) // For viewing full image

    const { toasts, success: showSuccess, error: showError, removeToast } = useToast()

    // Use categories from constants
    const categories = ['All', ...ALL_CATEGORIES]

    useEffect(() => {
        loadReceipts()
    }, [selectedCategory, searchQuery])

    const loadReceipts = async () => {
        try {
            setLoading(true)
            const data = await transactionService.getReceipts({
                category: selectedCategory === 'All' ? null : selectedCategory,
                search: searchQuery
            })
            setReceipts(data)
        } catch (error) {
            console.error('Error loading receipts:', error)
            showError(t('receipts.loadError', 'Failed to load receipts'))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        const { receipt } = deleteModal
        if (!receipt) return

        try {
            await transactionService.deleteReceipt(receipt.id)
            showSuccess(t('receipts.deleteSuccess', 'Receipt deleted successfully'))
            setReceipts(prev => prev.filter(r => r.id !== receipt.id))
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

            {/* Filters */}
            <div className="search-filter-container">
                <div className="search-wrapper flex-grow">
                    <SearchInput
                        onSearch={setSearchQuery}
                        placeholder={t('common.search', 'Search description, notes...')}
                    />
                </div>

                <div className="category-filter">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="form-control"
                        aria-label={t('common.filter')}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'All' ? t('common.viewAll', 'View All') : t(`categories.${cat.toLowerCase()}`, cat)}
                            </option>
                        ))}
                    </select>
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
            ) : receipts.length === 0 ? (
                <div className="empty-state card">
                    <p>{t('receipts.noReceipts', 'No receipts found.')}</p>
                </div>
            ) : (
                <div className="receipts-grid">
                    {receipts.map(receipt => (
                        <div key={receipt.id} className="card receipt-card">
                            <div className="receipt-image-container" onClick={() => setViewModal(receipt)}>
                                {receipt.attachmentUrl && receipt.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                                    <div className="pdf-placeholder">
                                        <span>PDF</span>
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
                                        <div className="uploaded-by">
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

            {/* Image Viewer Modal */}
            {viewModal && (
                <div className="image-viewer-modal" onClick={() => setViewModal(null)} role="dialog" aria-modal="true">
                    <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
                        {viewModal.attachmentUrl && viewModal.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={viewModal.attachmentUrl} title="Receipt PDF" width="100%" height="500px"></iframe>
                        ) : (
                            <img src={viewModal.attachmentUrl} alt="Full Receipt" />
                        )}
                        <button className="close-viewer" onClick={() => setViewModal(null)} aria-label={t('common.close')}>×</button>
                        <a href={viewModal.attachmentUrl} download target="_blank" rel="noopener noreferrer" className="download-btn btn btn-primary">
                            <FiDownload /> {t('common.download', 'Download')} {viewModal.user_profiles ? (t('dashboard.addedBy') + ' ' + viewModal.user_profiles.display_name) : ''}
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Receipts
