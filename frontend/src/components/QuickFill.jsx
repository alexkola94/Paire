import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { format } from 'date-fns'
import './QuickFill.css'

/**
 * Quick Fill Component
 * Shows recent transactions for quick-fill functionality
 */
function QuickFill({
  recentTransactions = [],
  onFill,
  maxItems = 5
}) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!recentTransactions || recentTransactions.length === 0) {
    return null
  }

  const displayedTransactions = isExpanded
    ? recentTransactions.slice(0, maxItems * 2)
    : recentTransactions.slice(0, maxItems)

  const handleFill = (transaction) => {
    if (onFill) {
      onFill({
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description || '',
        date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0]
      })
    }
  }

  return (
    <div className="quick-fill">
      <div
        className="quick-fill-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <div className="quick-fill-title">
          <FiClock size={16} />
          <span>{t('transaction.smartSuggestions.recentTransactions')}</span>
        </div>
        <div className="quick-fill-toggle">
          {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </div>

      {displayedTransactions.length > 0 && (
        <div className="quick-fill-list">
          {displayedTransactions.map((transaction, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleFill(transaction)}
              className="quick-fill-item"
            >
              <div className="quick-fill-item-main">
                <div className="quick-fill-amount">
                  €{transaction.amount?.toFixed(2) || '0.00'}
                </div>
                <div className="quick-fill-details">
                  <div className="quick-fill-description">
                    {transaction.description || t('transaction.noDescription')}
                  </div>
                  <div className="quick-fill-meta">
                    <span className="quick-fill-category">
                      {t(`categories.${(transaction.category || '').toLowerCase()}`)}
                    </span>
                    <span className="quick-fill-date">
                      {transaction.date
                        ? format(new Date(transaction.date), 'MMM dd')
                        : ''
                      }
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default QuickFill

