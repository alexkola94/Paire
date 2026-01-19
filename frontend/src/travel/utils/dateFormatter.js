/**
 * Date Formatting Utility
 * Provides consistent, locale-aware date formatting across the travel app
 */

/**
 * Maps i18n language codes to proper locale codes for date formatting
 */
const getLocaleFromLanguage = (language) => {
  const localeMap = {
    'en': 'en-US',
    'el': 'el-GR',
    'es': 'es-ES',
    'fr': 'fr-FR'
  }
  
  return localeMap[language] || localeMap['en']
}

/**
 * Normalizes a date string to YYYY-MM-DD format
 * Handles ISO strings (e.g., "2026-01-21T00:00:00Z") and extracts just the date part
 * @param {string} dateString - Date in various formats
 * @returns {string} Date in YYYY-MM-DD format
 */
const normalizeDateString = (dateString) => {
  if (!dateString) return ''
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // If it's an ISO string (e.g., "2026-01-21T00:00:00Z"), extract the date part
  if (dateString.includes('T')) {
    return dateString.split('T')[0]
  }
  
  return dateString
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) to a localized display format
 * @param {string} dateString - Date in YYYY-MM-DD format or ISO string
 * @param {string} language - i18n language code (en, el, es, fr)
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, language = 'en', options = {}) => {
  if (!dateString) return ''
  
  try {
    // Normalize the date string to YYYY-MM-DD format
    const normalizedDate = normalizeDateString(dateString)
    
    // Parse the date string (YYYY-MM-DD)
    const date = new Date(normalizedDate + 'T00:00:00')
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return dateString
    }
    
    const locale = getLocaleFromLanguage(language)
    
    // Default options for date display
    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    }
    
    return date.toLocaleDateString(locale, defaultOptions)
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Formats a date to a long format (e.g., "January 15, 2024")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} language - i18n language code
 * @returns {string} Formatted date string
 */
export const formatDateLong = (dateString, language = 'en') => {
  return formatDate(dateString, language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Formats a date to a short format (e.g., "01/15/2024" or "15/01/2024" depending on locale)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} language - i18n language code
 * @returns {string} Formatted date string
 */
export const formatDateShort = (dateString, language = 'en') => {
  return formatDate(dateString, language, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formats a date with weekday (e.g., "Mon, Jan 15, 2024")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} language - i18n language code
 * @returns {string} Formatted date string
 */
export const formatDateWithWeekday = (dateString, language = 'en') => {
  return formatDate(dateString, language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Formats a date range (e.g., "Jan 15 - Jan 20" or "Jan 15" if same date)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @param {string} language - i18n language code
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate, language = 'en') => {
  if (!startDate) return ''
  
  const startStr = formatDate(startDate, language, { month: 'short', day: 'numeric' })
  const endStr = endDate ? formatDate(endDate, language, { month: 'short', day: 'numeric' }) : startStr
  
  if (startStr === endStr) return startStr
  return `${startStr} - ${endStr}`
}

/**
 * Gets the locale string for the current language
 * @param {string} language - i18n language code
 * @returns {string} Locale string (e.g., 'en-US')
 */
export const getLocale = (language) => {
  return getLocaleFromLanguage(language)
}
