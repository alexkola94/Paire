import { useState, useEffect, useRef } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import './AutoCompleteInput.css'

/**
 * Auto-complete Input Component
 * Provides suggestions based on recent transactions
 */
function AutoCompleteInput({
  value = '',
  onChange,
  suggestions = [],
  name = 'description',
  id = 'description',
  placeholder = '',
  label,
  required = false,
  disabled = false,
  maxSuggestions = 5,
  minChars = 2
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  /**
   * Filter suggestions based on input value
   */
  useEffect(() => {
    if (!value || value.length < minChars) {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, maxSuggestions)

    setFilteredSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [value, suggestions, maxSuggestions, minChars])

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    if (onChange) {
      onChange(e)
    }
    setHighlightedIndex(-1)
  }

  /**
   * Handle input focus
   */
  const handleFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  /**
   * Handle input blur (with delay to allow clicks on suggestions)
   */
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }, 200)
  }

  /**
   * Handle suggestion selection
   */
  const handleSelectSuggestion = (suggestion) => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: suggestion
        }
      })
    }
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSelectSuggestion(filteredSuggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setHighlightedIndex(-1)
        break
    }
  }

  /**
   * Clear input
   */
  const handleClear = () => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: ''
        }
      })
    }
    inputRef.current?.focus()
  }

  return (
    <div className="autocomplete-input-wrapper">
      {label && (
        <label htmlFor={id} className="autocomplete-input-label">
          {label}
        </label>
      )}

      <div className="autocomplete-input-container">
        <div className="autocomplete-icon">
          <FiSearch size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="autocomplete-input"
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="autocomplete-clear"
            aria-label="Clear"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="autocomplete-suggestions" ref={suggestionsRef}>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`autocomplete-suggestion ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <FiSearch size={14} />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AutoCompleteInput

