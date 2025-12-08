import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiX, FiCheck } from 'react-icons/fi'
import './DuplicateDetection.css'

/**
 * Duplicate Detection Component
 * Warns users about potentially duplicate transactions
 */
function DuplicateDetection({
  similarTransactions = [],
  onDismiss,
  onProceed
}) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(similarTransactions.length > 0)
  }, [similarTransactions])

  if (!isVisible || similarTransactions.length === 0) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleProceed = () => {
    setIsVisible(false)
    if (onProceed) {
      onProceed()
    }
  }

  return (
    <div className="duplicate-detection">
      <div className="duplicate-detection-icon">
        <FiAlertTriangle size={20} />
      </div>
      <div className="duplicate-detection-content">
        <div className="duplicate-detection-title">
          {t('transaction.duplicateWarning.title', { count: similarTransactions.length })}
        </div>
        <div className="duplicate-detection-message">
          {t('transaction.duplicateWarning.message')}
        </div>
        <div className="duplicate-detection-list">
          {similarTransactions.slice(0, 3).map((transaction, index) => (
            <div key={index} className="duplicate-item">
              <span className="duplicate-amount">
                €{transaction.amount?.toFixed(2) || '0.00'}
              </span>
              <span className="duplicate-description">
                {transaction.description || t('transaction.noDescription')}
              </span>
              <span className="duplicate-date">
                {new Date(transaction.date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="duplicate-detection-actions">
        <button
          type="button"
          onClick={handleProceed}
          className="duplicate-action-btn proceed"
          aria-label={t('transaction.duplicateWarning.proceed')}
        >
          <FiCheck size={16} />
          {t('transaction.duplicateWarning.proceed')}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="duplicate-action-btn dismiss"
          aria-label={t('transaction.duplicateWarning.dismiss')}
        >
          <FiX size={16} />
          {t('transaction.duplicateWarning.dismiss')}
        </button>
      </div>
    </div>
  )
}

export default DuplicateDetection

