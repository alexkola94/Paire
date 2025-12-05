import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './ConfirmationModal.css'

/**
 * Confirmation Modal Component
 * Reusable modal for delete confirmations and other critical actions
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when modal is closed
 * @param {function} onConfirm - Function to call when user confirms
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default: "Delete")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Modal variant: "danger" (default) or "warning"
 * @param {boolean} loading - Whether the action is in progress
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

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  // Handle confirm action
  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  return (
    <div 
      className={`confirmation-modal-overlay ${variant}`}
      onClick={handleBackdropClick}
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
    </div>
  )
}

export default ConfirmationModal

