/**
 * Validation Utility
 * Provides validation rules and functions for form fields
 */

/**
 * Validation rule types
 */
export const ValidationRule = {
  REQUIRED: 'required',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  MIN_VALUE: 'minValue',
  MAX_VALUE: 'maxValue',
  EMAIL: 'email',
  URL: 'url',
  NUMBER: 'number',
  POSITIVE_NUMBER: 'positiveNumber',
  DATE: 'date',
  PATTERN: 'pattern',
  CUSTOM: 'custom'
}

/**
 * Validation result
 */
export class ValidationResult {
  constructor(isValid, message = '', type = 'error') {
    this.isValid = isValid
    this.message = message
    this.type = type // 'error', 'warning', 'info', 'success'
  }
}

/**
 * Validation rules
 */
export const validationRules = {
  /**
   * Required field validation
   */
  required: (value, message = 'This field is required') => {
    if (value === null || value === undefined || value === '') {
      return new ValidationResult(false, message, 'error')
    }
    if (Array.isArray(value) && value.length === 0) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Minimum length validation
   */
  minLength: (value, min, message = `Minimum length is ${min} characters`) => {
    if (!value || value.length < min) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Maximum length validation
   */
  maxLength: (value, max, message = `Maximum length is ${max} characters`) => {
    if (value && value.length > max) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Minimum value validation
   */
  minValue: (value, min, message = `Minimum value is ${min}`) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < min) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Maximum value validation
   */
  maxValue: (value, max, message = `Maximum value is ${max}`) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue > max) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Email validation
   */
  email: (value, message = 'Please enter a valid email address') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * URL validation
   */
  url: (value, message = 'Please enter a valid URL') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    try {
      new URL(value)
      return new ValidationResult(true, '', 'success')
    } catch {
      return new ValidationResult(false, message, 'error')
    }
  },

  /**
   * Number validation
   */
  number: (value, message = 'Please enter a valid number') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    if (isNaN(parseFloat(value))) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Positive number validation
   */
  positiveNumber: (value, message = 'Please enter a positive number') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Date validation
   */
  date: (value, message = 'Please enter a valid date') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Pattern validation (regex)
   */
  pattern: (value, pattern, message = 'Please enter a valid value') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    const regex = new RegExp(pattern)
    if (!regex.test(value)) {
      return new ValidationResult(false, message, 'error')
    }
    return new ValidationResult(true, '', 'success')
  },

  /**
   * Custom validation function
   */
  custom: (value, validator, message = 'Validation failed') => {
    if (!value) return new ValidationResult(true, '', 'success') // Optional field
    const result = validator(value)
    if (result === true) {
      return new ValidationResult(true, '', 'success')
    }
    return new ValidationResult(false, typeof result === 'string' ? result : message, 'error')
  }
}

/**
 * Validate a field value against multiple rules
 * @param {*} value - The value to validate
 * @param {Array} rules - Array of validation rule objects { type, params, message }
 * @returns {ValidationResult} - The validation result
 */
export function validateField(value, rules = []) {
  if (!rules || rules.length === 0) {
    return new ValidationResult(true, '', 'success')
  }

  for (const rule of rules) {
    const { type, params = [], message } = rule
    const validator = validationRules[type]

    if (!validator) {
      console.warn(`Unknown validation rule: ${type}`)
      continue
    }

    const result = validator(value, ...params, message)
    if (!result.isValid) {
      return result
    }
  }

  return new ValidationResult(true, '', 'success')
}

/**
 * Validate multiple fields
 * @param {Object} values - Object with field names as keys and values
 * @param {Object} fieldRules - Object with field names as keys and rule arrays
 * @returns {Object} - Object with field names as keys and ValidationResult as values
 */
export function validateFields(values, fieldRules) {
  const results = {}
  
  for (const fieldName in fieldRules) {
    const value = values[fieldName]
    const rules = fieldRules[fieldName]
    results[fieldName] = validateField(value, rules)
  }

  return results
}

/**
 * Check if all fields are valid
 * @param {Object} validationResults - Object with ValidationResult values
 * @returns {boolean} - True if all fields are valid
 */
export function areAllFieldsValid(validationResults) {
  return Object.values(validationResults).every(result => result.isValid)
}

/**
 * Get character count for text fields
 * @param {string} value - The text value
 * @returns {number} - Character count
 */
export function getCharacterCount(value) {
  return value ? value.length : 0
}

/**
 * Get word count for text fields
 * @param {string} value - The text value
 * @returns {number} - Word count
 */
export function getWordCount(value) {
  if (!value || !value.trim()) return 0
  return value.trim().split(/\s+/).length
}

