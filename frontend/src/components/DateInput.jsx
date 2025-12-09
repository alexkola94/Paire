import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCalendar } from 'react-icons/fi'
import { format, isToday, isYesterday, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'
import './DateInput.css'

/**
 * Enhanced Date Input Component
 * Features:
 * - Quick date selection buttons
 * - Calendar icon
 * - Better styling
 * - Smart defaults
 */
function DateInput({ 
  value = '', 
  onChange, 
  name = 'date',
  id = 'date',
  required = false,
  disabled = false,
  label,
  showQuickButtons = true
}) {
  const { t } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)
  const dateInputRef = useRef(null)

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getToday = () => {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Get yesterday's date
   */
  const getYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  /**
   * Get start of this week (Monday)
   */
  const getThisWeekStart = () => {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }

  /**
   * Get end of this week (Sunday)
   */
  const getThisWeekEnd = () => {
    return format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }

  /**
   * Handle quick date selection
   */
  const handleQuickDate = (dateString) => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: dateString
        }
      })
    }
  }

  /**
   * Handle "This Week" button click
   * Sets the date to today (to show current week) and opens the calendar
   */
  const handleThisWeek = () => {
    const today = getToday()
    
    // Set the date to today so calendar opens showing current week
    handleQuickDate(today)
    
    // Open the calendar picker
    // Use setTimeout to ensure the date is set first
    setTimeout(() => {
      if (dateInputRef.current) {
        // Try modern showPicker() API first (supported in Chrome, Edge, Safari 16+)
        if (typeof dateInputRef.current.showPicker === 'function') {
          try {
            dateInputRef.current.showPicker()
          } catch (error) {
            // Fallback if showPicker fails
            dateInputRef.current.focus()
            dateInputRef.current.click()
          }
        } else {
          // Fallback for browsers without showPicker support
          dateInputRef.current.focus()
          dateInputRef.current.click()
        }
      }
    }, 50)
  }

  /**
   * Check if date is today
   */
  const isDateToday = (dateString) => {
    if (!dateString) return false
    try {
      return isToday(parseISO(dateString))
    } catch {
      return false
    }
  }

  /**
   * Check if date is yesterday
   */
  const isDateYesterday = (dateString) => {
    if (!dateString) return false
    try {
      return isYesterday(parseISO(dateString))
    } catch {
      return false
    }
  }

  /**
   * Check if date is this week
   */
  const isDateThisWeek = (dateString) => {
    if (!dateString) return false
    try {
      const date = parseISO(dateString)
      return isWithinInterval(date, {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
      })
    } catch {
      return false
    }
  }

  return (
    <div className="date-input-wrapper">
      {label && (
        <label htmlFor={id} className="date-input-label">
          {label}
        </label>
      )}

      <div className="date-input-container">
        <div className="date-icon">
          <FiCalendar size={20} />
        </div>
        <input
          ref={dateInputRef}
          type="date"
          id={id}
          name={name}
          value={value || getToday()}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="date-input"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={label || t('transaction.date')}
          aria-required={required}
        />
      </div>

      {/* Quick Date Buttons */}
      {showQuickButtons && !disabled && (
        <div className="quick-dates">
          <button
            type="button"
            onClick={() => handleQuickDate(getToday())}
            className={`quick-date-btn ${isDateToday(value) ? 'active' : ''}`}
            aria-label={t('transaction.quickDate.today')}
          >
            {t('transaction.quickDate.today')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(getYesterday())}
            className={`quick-date-btn ${isDateYesterday(value) ? 'active' : ''}`}
            aria-label={t('transaction.quickDate.yesterday')}
          >
            {t('transaction.quickDate.yesterday')}
          </button>
          <button
            type="button"
            onClick={handleThisWeek}
            className={`quick-date-btn ${isDateThisWeek(value) ? 'active' : ''}`}
            aria-label={t('transaction.quickDate.thisWeek')}
          >
            {t('transaction.quickDate.thisWeek')}
          </button>
        </div>
      )}
    </div>
  )
}

export default DateInput

