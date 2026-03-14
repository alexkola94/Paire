import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTag, FiX } from 'react-icons/fi'
import './TagsInput.css'

const DEFAULT_SUGGESTIONS = []

/**
 * Tags Input Component
 * Allows users to add and manage tags for transactions
 */
function TagsInput({
  tags = [],
  suggestions = DEFAULT_SUGGESTIONS,
  onChange,
  name = 'tags',
  label,
  maxTags = 10
}) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  /**
   * Filter suggestions based on input
   */
  useEffect(() => {
    if (!inputValue || inputValue.trim().length === 0) {
      setFilteredSuggestions(suggestions.filter(s => !tags.includes(s)).slice(0, 5))
      return
    }

    const filtered = suggestions
      .filter(s =>
        !tags.includes(s) &&
        s.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 5)

    setFilteredSuggestions(filtered)
  }, [inputValue, suggestions, tags])

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    setShowSuggestions(true)
  }

  /**
   * Handle adding a tag
   */
  const handleAddTag = (tagValue) => {
    const trimmedTag = (tagValue || inputValue).trim().toLowerCase()

    if (!trimmedTag || tags.length >= maxTags) return
    if (tags.includes(trimmedTag)) return

    const newTags = [...tags, trimmedTag]
    if (onChange) {
      onChange({
        target: {
          name,
          value: newTags
        }
      })
    }

    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  /**
   * Handle removing a tag
   */
  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    if (onChange) {
      onChange({
        target: {
          name,
          value: newTags
        }
      })
    }
  }

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  /**
   * Handle input blur
   */
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  return (
    <div className="tags-input-wrapper" ref={containerRef}>
      {label && (
        <label className="tags-input-label">
          {label}
        </label>
      )}

      <div className="tags-input-container">
        <div className="tags-list">
          {tags.map((tag, index) => (
            <span key={index} className="tag-item">
              <FiTag size={12} />
              <span className="tag-text">{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="tag-remove"
                aria-label={t('common.remove')}
              >
                <FiX size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="tags-input-field-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder={tags.length >= maxTags ? t('transaction.tags.maxReached') : t('transaction.tags.placeholder')}
            className="tags-input-field"
            disabled={tags.length >= maxTags}
            maxLength={20}
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="tags-suggestions">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAddTag(suggestion)}
                  className="tags-suggestion-item"
                >
                  <FiTag size={14} />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <small className="tags-hint">
          {t('transaction.tags.count', { count: tags.length, max: maxTags })}
        </small>
      )}
    </div>
  )
}

export default TagsInput

