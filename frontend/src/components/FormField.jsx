import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'
import { validateField, getCharacterCount, getWordCount } from '../utils/validation'
import './FormField.css'

/**
 * FormField Component
 * Wrapper component for form inputs with real-time validation and feedback
 */
function FormField({
  label,
  name,
  id,
  type = 'text',
  value,
  onChange,
  onBlur,
  rules = [],
  required = false,
  disabled = false,
  placeholder,
  helpText,
  showCharacterCount = false,
  showWordCount = false,
  maxLength,
  minLength,
  children, // For custom input elements
  className = '',
  validateOnChange = true,
  validateOnBlur = true,
  ...inputProps
}) {
  const { t } = useTranslation()
  const [validationResult, setValidationResult] = useState(null)
  const [isFocused, setIsFocused] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const fieldRef = useRef(null)

  // Prepare validation rules
  const validationRules = [
    ...rules,
    ...(required ? [{ type: 'required', params: [], message: t('validation.required', { field: label }) }] : []),
    ...(minLength ? [{ type: 'minLength', params: [minLength], message: t('validation.minLength', { min: minLength, field: label }) }] : []),
    ...(maxLength ? [{ type: 'maxLength', params: [maxLength], message: t('validation.maxLength', { max: maxLength, field: label }) }] : [])
  ]

  /**
   * Validate field value
   */
  const validate = (val = value) => {
    if (validationRules.length === 0) {
      setValidationResult(null)
      return true
    }

    const result = validateField(val, validationRules)
    setValidationResult(result)
    return result.isValid
  }

  /**
   * Handle field change
   */
  const handleChange = (e) => {
    const newValue = e.target.value
    onChange(e)

    if (validateOnChange && hasInteracted) {
      validate(newValue)
    }
  }

  /**
   * Handle field blur
   */
  const handleBlur = (e) => {
    setIsFocused(false)
    setHasInteracted(true)
    if (validateOnBlur) {
      validate()
    }

    if (onBlur) {
      onBlur(e)
    }
  }

  /**
   * Handle field focus
   */
  const handleFocus = () => {
    setIsFocused(true)
  }



  // Validate on mount if value exists
  useEffect(() => {
    if (value && validationRules.length > 0) {
      validate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Get validation icon
  const getValidationIcon = () => {
    if (!validationResult || !hasInteracted) return null

    const icons = {
      success: <FiCheckCircle className="validation-icon success" size={18} />,
      error: <FiAlertCircle className="validation-icon error" size={18} />,
      warning: <FiAlertCircle className="validation-icon warning" size={18} />,
      info: <FiInfo className="validation-icon info" size={18} />
    }

    return icons[validationResult.type] || null
  }

  // Get field classes
  const fieldClasses = [
    'form-field',
    className,
    validationResult && hasInteracted ? `form-field-${validationResult.type}` : '',
    isFocused ? 'form-field-focused' : '',
    disabled ? 'form-field-disabled' : '',
    required ? 'form-field-required' : ''
  ].filter(Boolean).join(' ')

  // Character/word counts
  const characterCount = showCharacterCount ? getCharacterCount(value) : null
  const wordCount = showWordCount ? getWordCount(value) : null

  return (
    <div className={fieldClasses} ref={fieldRef}>
      {label && (
        <label htmlFor={id || name} className="form-field-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      <div className="form-field-input-wrapper">
        {children ? (
          // Custom input element
          <div className="form-field-custom-input">
            {children}
          </div>
        ) : (
          // Standard input element
          <input
            type={type}
            id={id || name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            minLength={minLength}
            className="form-field-input"
            aria-invalid={validationResult && !validationResult.isValid}
            aria-describedby={
              validationResult?.message || helpText
                ? `${name}-help`
                : undefined
            }
            {...inputProps}
          />
        )}

        {/* Validation icon */}
        {getValidationIcon()}
      </div>

      {/* Help text and validation message */}
      {(helpText || validationResult?.message) && (
        <div
          id={`${name}-help`}
          className={`form-field-message ${validationResult ? `form-field-message-${validationResult.type}` : 'form-field-message-help'
            }`}
        >
          {validationResult?.message || helpText}
        </div>
      )}

      {/* Character/word count */}
      {(showCharacterCount || showWordCount) && (
        <div className="form-field-count">
          {showCharacterCount && (
            <span className="character-count">
              {characterCount}
              {maxLength && ` / ${maxLength}`}
            </span>
          )}
          {showWordCount && (
            <span className="word-count">
              {wordCount} {t('validation.words')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default FormField

