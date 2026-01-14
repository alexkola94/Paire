import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  FiX,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiTag,
  FiFileText,
  FiUser,
  FiDollarSign,
  FiPaperclip
} from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './TransactionDetailModal.css'

/**
 * TransactionDetailModal Component
 * Displays transaction details in a popup modal
 * Closes on outside click or close button
 * 
 * @param {Object} transaction - The transaction to display
 * @param {Function} onClose - Function to close the modal
 * @param {boolean} isOpen - Whether the modal is open
 */
function TransactionDetailModal({ transaction, onClose, isOpen }) {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const modalRef = useRef(null)
  const overlayRef = useRef(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && event.target === overlayRef.current) {
        onClose()
      }
    }

    // Handle escape key to close
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Don't render if not open or no transaction
  if (!isOpen || !transaction) return null

  // Format the date
  const formattedDate = format(new Date(transaction.date), 'EEEE, MMMM dd, yyyy')
  
  // Determine if income or expense
  const isIncome = transaction.type === 'income'
  
  // Get user info if available
  const userProfile = transaction.user_profiles
  const addedByName = userProfile?.display_name || userProfile?.email || null
  const avatarUrl = userProfile?.avatar_url || userProfile?.avatarUrl

  // Check if imported from bank
  const isBankImport = transaction.paidBy === 'Bank' || transaction.isBankSynced

  const modalContent = (
    <div 
      className="transaction-detail-overlay" 
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-detail-title"
    >
      <div 
        className={`transaction-detail-modal ${isIncome ? 'income' : 'expense'}`}
        ref={modalRef}
      >
        {/* Header */}
        <div className="transaction-detail-header">
          <div className={`transaction-type-badge ${transaction.type}`}>
            {isIncome ? <FiTrendingUp size={18} /> : <FiTrendingDown size={18} />}
            <span>{isIncome ? t('common.income') : t('common.expense')}</span>
          </div>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Amount - Hero Section */}
        <div className="transaction-amount-hero">
          <span className={`amount ${transaction.type}`}>
            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
          </span>
        </div>

        {/* Details Section */}
        <div className="transaction-detail-content">
          {/* Category */}
          <div className="detail-row">
            <div className="detail-icon">
              <FiTag />
            </div>
            <div className="detail-info">
              <span className="detail-label">{t('transaction.category')}</span>
              <span className="detail-value category-value">
                {t(`categories.${(transaction.category || '').toLowerCase()}`) || transaction.category || '-'}
              </span>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="detail-row">
              <div className="detail-icon">
                <FiFileText />
              </div>
              <div className="detail-info">
                <span className="detail-label">{t('transaction.description')}</span>
                <span className="detail-value">{transaction.description}</span>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="detail-row">
            <div className="detail-icon">
              <FiCalendar />
            </div>
            <div className="detail-info">
              <span className="detail-label">{t('transaction.date')}</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div className="detail-row">
              <div className="detail-icon">
                <FiFileText />
              </div>
              <div className="detail-info">
                <span className="detail-label">{t('transaction.notes')}</span>
                <span className="detail-value notes-value">{transaction.notes}</span>
              </div>
            </div>
          )}

          {/* Added By / Source */}
          <div className="detail-row">
            <div className="detail-icon">
              <FiUser />
            </div>
            <div className="detail-info">
              <span className="detail-label">{t('transaction.source', 'Source')}</span>
              <span className="detail-value source-value">
                {isBankImport ? (
                  <span className="bank-import-badge">
                    {t('dashboard.bankConnection', 'Imported from Bank')}
                  </span>
                ) : addedByName ? (
                  <span className="user-badge">
                    {avatarUrl && (
                      <img 
                        src={avatarUrl} 
                        alt={addedByName} 
                        className="user-avatar"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    {addedByName}
                  </span>
                ) : (
                  t('transaction.manual', 'Manual Entry')
                )}
              </span>
            </div>
          </div>

          {/* Attachment */}
          {transaction.attachmentUrl && (
            <div className="detail-row">
              <div className="detail-icon">
                <FiPaperclip />
              </div>
              <div className="detail-info">
                <span className="detail-label">{t('transaction.attachment')}</span>
                <a 
                  href={transaction.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  {t('transaction.viewAttachment', 'View Attachment')}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="transaction-detail-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )

  // Render in portal for proper stacking
  return createPortal(modalContent, document.body)
}

export default TransactionDetailModal
