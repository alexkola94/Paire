import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './CurrencyInput.css'

/**
 * Enhanced Currency Input Component
 * Features:
 * - Currency formatting as user types
 * - Quick amount buttons
 * - Large, prominent display
 * - Auto-format on blur
 */
function CurrencyInput({
  value = '',
  onChange,
  name = 'amount',
  id = 'amount',
  placeholder = '0.00',
  required = false,
  disabled = false,
  label,
  quickAmounts = [10, 50, 100, 500]
}) {
  const { t } = useTranslation()
  const [displayValue, setDisplayValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  /**
   * Format number to currency string
   */
  const formatCurrency = (num) => {
    if (!num && num !== 0) return ''
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/[^\d.-]/g, '')) : num
    if (isNaN(numValue)) return ''

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue)
  }

  /**
   * Parse currency string to number
   */
  const parseCurrency = (str) => {
    if (!str) return ''
    // Replace commas with dots to support both formats
    const normalized = str.replace(/,/g, '.')
    // Remove all non-digit characters except decimal point
    const cleaned = normalized.replace(/[^\d.]/g, '')
    // Handle multiple decimal points
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('')
    }
    return cleaned
  }

  /**
   * Initialize display value from prop
   */
  useEffect(() => {
    if (value && !isFocused) {
      setDisplayValue(formatCurrency(value))
    } else if (!value && !isFocused) {
      setDisplayValue('')
    }
  }, [value, isFocused])

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const inputValue = e.target.value
    const parsed = parseCurrency(inputValue)
    setDisplayValue(inputValue)

    // Update parent with numeric value
    if (onChange) {
      const numericValue = parsed ? parseFloat(parsed) : ''
      onChange({
        target: {
          name,
          value: numericValue
        }
      })
    }
  }

  /**
   * Handle focus
   */
  const handleFocus = () => {
    setIsFocused(true)
    // Show raw number when focused
    if (value) {
      setDisplayValue(value.toString())
    }
  }

  /**
   * Handle blur - format the value
   */
  const handleBlur = () => {
    setIsFocused(false)
    if (value) {
      setDisplayValue(formatCurrency(value))
    } else {
      setDisplayValue('')
    }
  }

  /**
   * Handle quick amount button click
   */
  const handleQuickAmount = (amount) => {
    // First update display immediately for responsive UX
    setDisplayValue(formatCurrency(amount))

    // Then notify parent
    if (onChange) {
      onChange({
        target: {
          name,
          value: amount
        }
      })
    }
  }

  return (
    <div className="currency-input-wrapper">
      {label && (
        <label htmlFor={id} className="currency-input-label">
          {label}
        </label>
      )}

      <div className="currency-input-container">
        <div className="currency-symbol">€</div>
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="currency-input"
          inputMode="decimal"
          aria-label={label || t('transaction.amount')}
          aria-required={required}
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="quick-amounts">
        {quickAmounts.map(amount => (
          <button
            key={amount}
            type="button"
            onClick={() => handleQuickAmount(amount)}
            className="quick-amount-btn"
            disabled={disabled}
            aria-label={`Quick amount: €${amount}`}
          >
            €{amount}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CurrencyInput

