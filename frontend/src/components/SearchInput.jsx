import { useState, useEffect, useRef } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './SearchInput.css'

/**
 * Mobile-first Search Input Component
 * Features:
 * - Built-in debounce
 * - Clear button
 * - Animated focus state
 * - Glassmorphism style
 */
const SearchInput = ({
    onSearch,
    placeholder,
    debounceMs = 500,
    initialValue = '',
    className = ''
}) => {
    const { t } = useTranslation()
    const [value, setValue] = useState(initialValue)
    const [isFocused, setIsFocused] = useState(false)
    const debounceTimer = useRef(null)

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    const handleChange = (e) => {
        const newValue = e.target.value
        setValue(newValue)

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }

        // If value is empty, search immediately to restore list
        if (newValue.trim() === '') {
            onSearch('')
            return
        }

        // Set new timer
        debounceTimer.current = setTimeout(() => {
            onSearch(newValue)
        }, debounceMs)
    }

    const handleClear = () => {
        setValue('')
        onSearch('')
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current)
        }
    }

    return (
        <div className={`search-input-container ${isFocused ? 'focused' : ''} ${className}`}>
            <FiSearch className="search-icon" />
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder || t('common.search', 'Search...')}
                className="search-input"
                aria-label={t('common.search', 'Search')}
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="search-clear-btn"
                    aria-label={t('common.clear', 'Clear')}
                >
                    <FiX />
                </button>
            )}
        </div>
    )
}

export default SearchInput
