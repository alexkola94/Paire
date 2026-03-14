import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCalendar } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '../utils/dateFormatter'
import '../styles/DatePicker.css'

/**
 * Custom DatePicker Component
 * Styled according to Paire design system with glassmorphism
 * 
 * @param {string} value - Current date value (YYYY-MM-DD format)
 * @param {function} onChange - Callback when date changes
 * @param {string} label - Label text (optional)
 * @param {string} min - Minimum date (YYYY-MM-DD format)
 * @param {string} max - Maximum date (YYYY-MM-DD format)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether input is disabled
 * @param {string} className - Additional CSS classes
 * @param {string} id - Input ID for accessibility
 */
const DatePicker = ({
  value = '',
  onChange,
  label,
  min,
  max,
  placeholder,
  disabled = false,
  className = '',
  id,
  ...props
}) => {
  const { i18n } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)
  const [displayValue, setDisplayValue] = useState('')
  const inputRef = useRef(null)

  // Normalize date value to YYYY-MM-DD format (extract date part from ISO strings)
  const normalizeDateValue = (dateValue) => {
    if (!dateValue) return ''

    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue
    }

    // If it's an ISO string (e.g., "2026-01-21T00:00:00Z"), extract the date part
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0]
    }

    // Try to parse as date and extract YYYY-MM-DD
    try {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch (error) {
      console.warn('Could not normalize date value:', dateValue)
    }

    return dateValue
  }

  // Normalized date value for the input (YYYY-MM-DD format)
  const normalizedValue = normalizeDateValue(value)

  // Update display value when value prop or language changes
  useEffect(() => {
    if (normalizedValue) {
      // Format date using the current language
      const formatted = formatDate(normalizedValue, i18n.language)
      setDisplayValue(formatted)
    } else {
      setDisplayValue('')
    }
  }, [normalizedValue, i18n.language])

  const handleChange = (e) => {
    const newValue = e.target.value
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.showPicker?.() || inputRef.current.focus()
    }
  }

  return (
    <div className={`date-picker-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="date-picker-label">
          {label}
        </label>
      )}
      <motion.div
        className={`date-picker-container ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
        transition={{ duration: 0.2 }}
      >
        <div className="date-picker-icon">
          <FiCalendar size={18} />
        </div>
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={normalizedValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={min ? normalizeDateValue(min) : undefined}
          max={max ? normalizeDateValue(max) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="date-picker-input"
          {...props}
        />
        <AnimatePresence>
          {displayValue && (
            <motion.div
              className="date-picker-display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {displayValue}
            </motion.div>
          )}
        </AnimatePresence>
        {!displayValue && placeholder && (
          <div className="date-picker-placeholder">
            {placeholder}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default DatePicker
