import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiRepeat } from 'react-icons/fi'
import DatePicker from './DatePicker'
import './RecurringTransaction.css'

/**
 * Recurring Transaction Component
 * Allows users to set up recurring transactions
 */
function RecurringTransaction({
  isRecurring = false,
  recurrencePattern = 'monthly',
  recurrenceEndDate = '',
  onToggle,
  onPatternChange,
  onEndDateChange
}) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(isRecurring)

  const patterns = [
    { value: 'daily', label: t('transaction.recurring.daily') },
    { value: 'weekly', label: t('transaction.recurring.weekly') },
    { value: 'monthly', label: t('transaction.recurring.monthly') },
    { value: 'yearly', label: t('transaction.recurring.yearly') }
  ]

  const handleToggle = (checked) => {
    setIsExpanded(checked)
    if (onToggle) {
      onToggle(checked)
    }
  }

  return (
    <div className="recurring-transaction">
      <div className="recurring-toggle">
        <label className="recurring-toggle-label">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => handleToggle(e.target.checked)}
            className="recurring-checkbox"
          />
          <div className="recurring-toggle-content">
            <FiRepeat size={18} />
            <span>{t('transaction.recurring.makeRecurring')}</span>
          </div>
        </label>
      </div>

      {isExpanded && isRecurring && (
        <div className="recurring-options">
          <div className="form-group">
            <label htmlFor="recurrencePattern">
              {t('transaction.recurring.pattern')} *
            </label>
            <select
              id="recurrencePattern"
              name="recurrencePattern"
              value={recurrencePattern}
              onChange={(e) => onPatternChange && onPatternChange(e.target.value)}
              className="recurring-select"
            >
              {patterns.map(pattern => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="recurrenceEndDate">
              {t('transaction.recurring.endDate')}
            </label>
            <DatePicker
              selected={recurrenceEndDate}
              onChange={(date) => onEndDateChange && onEndDateChange(date ? date.toISOString().split('T')[0] : '')}
              placeholder={t('transaction.recurring.endDate')}
              className="recurring-date-picker"
            />
            <small className="form-hint">
              {t('transaction.recurring.endDateHint')}
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecurringTransaction

