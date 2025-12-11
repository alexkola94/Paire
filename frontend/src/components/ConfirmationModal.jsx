import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './ConfirmationModal.css'

/**
 * Confirmation Modal Component
 * Reusable modal for delete confirmations and other critical actions
 * Rendered via Portal to ensure correct z-index stacking
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * ...
 */
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false
}) {
  const { t } = useTranslation()

  // Handle Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, loading])

  if (!isOpen) return null

  // Default texts
  const defaultTitle = variant === 'danger'
    ? t('confirmationModal.deleteTitle')
    : t('confirmationModal.warningTitle')
  const defaultMessage = t('confirmationModal.defaultMessage')
  const defaultConfirmText = variant === 'danger'
    ? t('confirmationModal.delete')
    : t('confirmationModal.confirm')
  const defaultCancelText = t('common.cancel')

  // Handle confirm action
  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  return createPortal(
    <div
      className={`confirmation-modal-overlay ${variant}`}
      onClick={() => {
        if (!loading) onClose()
      }}
    >
      <div
        className="confirmation-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="confirmation-modal-header">
          <div className="confirmation-modal-icon">
            <FiAlertTriangle size={24} />
          </div>
          <h2>{title || defaultTitle}</h2>
          {!loading && (
            <button
              className="confirmation-modal-close"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="confirmation-modal-body">
          <p>{message || defaultMessage}</p>
        </div>

        {/* Modal Footer */}
        <div className="confirmation-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText || defaultCancelText}
          </button>
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-warning'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                {t('common.processing')}
              </>
            ) : (
              confirmText || defaultConfirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmationModal

