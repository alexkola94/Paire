import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiPercent, FiDollarSign, FiX } from 'react-icons/fi'
import './SplitTransaction.css'

/**
 * Split Transaction Component
 * Allows users to split transactions between partners
 */
function SplitTransaction({
  enabled = false,
  splitType = 'equal',
  splitPercentage = 50,
  paidBy = 'me',
  onToggle,
  onSplitTypeChange,
  onPercentageChange,
  onPaidByChange,
  partnerName = 'Partner'
}) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(enabled)

  const splitTypes = [
    { value: 'equal', label: t('transaction.split.equal'), icon: FiUsers },
    { value: 'percentage', label: t('transaction.split.percentage'), icon: FiPercent },
    { value: 'custom', label: t('transaction.split.custom'), icon: FiDollarSign }
  ]

  const handleToggle = (checked) => {
    setIsExpanded(checked)
    if (onToggle) {
      onToggle(checked)
    }
  }

  const handlePercentageChange = (e) => {
    const value = parseFloat(e.target.value) || 0
    const clampedValue = Math.min(100, Math.max(0, value))
    if (onPercentageChange) {
      onPercentageChange(clampedValue)
    }
  }

  return (
    <div className="split-transaction">
      <div className="split-toggle">
        <label className="split-toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="split-checkbox"
          />
          <div className="split-toggle-content">
            <FiUsers size={18} />
            <span>{t('transaction.split.splitTransaction')}</span>
          </div>
        </label>
      </div>

      {isExpanded && enabled && (
        <div className="split-options">
          <div className="form-group">
            <label htmlFor="splitType">
              {t('transaction.split.splitType')} *
            </label>
            <div className="split-type-buttons">
              {splitTypes.map(type => {
                const IconComponent = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onSplitTypeChange && onSplitTypeChange(type.value)}
                    className={`split-type-btn ${splitType === type.value ? 'active' : ''}`}
                  >
                    <IconComponent size={18} />
                    <span>{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {splitType === 'percentage' && (
            <div className="form-group">
              <label htmlFor="splitPercentage">
                {t('transaction.split.yourPercentage')} (%)
              </label>
              <div className="split-percentage-input">
                <input
                  type="number"
                  id="splitPercentage"
                  name="splitPercentage"
                  value={splitPercentage}
                  onChange={handlePercentageChange}
                  min="0"
                  max="100"
                  step="1"
                  className="split-percentage-field"
                />
                <span className="split-percentage-symbol">%</span>
              </div>
              <div className="split-preview">
                <div className="split-preview-item">
                  <span className="split-preview-label">{t('transaction.split.you')}:</span>
                  <span className="split-preview-amount">{splitPercentage}%</span>
                </div>
                <div className="split-preview-item">
                  <span className="split-preview-label">{partnerName}:</span>
                  <span className="split-preview-amount">{100 - splitPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="paidBy">
              {t('transaction.split.paidBy')} *
            </label>
            <select
              id="paidBy"
              name="paidBy"
              value={paidBy}
              onChange={(e) => onPaidByChange && onPaidByChange(e.target.value)}
              className="split-select"
            >
              <option value="me">{t('transaction.split.me')}</option>
              <option value="partner">{partnerName}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default SplitTransaction

