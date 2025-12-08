import { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import './Dropdown.css'

/**
 * Dropdown Component
 * 
 * A custom dropdown with smooth animations and better UX than native select.
 * Features:
 * - Smooth open/close animations
 * - Keyboard navigation support
 * - Click outside to close
 * - Accessible with ARIA labels
 * - Theme-aware colors
 * - Responsive design
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of { value, label } objects
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when selection changes
 * @param {React.ReactNode} props.icon - Optional icon to display before text
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.id - ID for accessibility
 */
const Dropdown = ({ 
  options = [], 
  value, 
  onChange, 
  icon = null,
  placeholder = 'Select...',
  className = '',
  id = null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value) || options[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            handleSelect(options[focusedIndex].value)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setFocusedIndex(-1)
          buttonRef.current?.focus()
          break
        default:
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, focusedIndex, options])

  // Handle option selection
  const handleSelect = (selectedValue) => {
    if (onChange) {
      onChange(selectedValue)
    }
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setFocusedIndex(options.findIndex(opt => opt.value === value))
    }
  }

  return (
    <div 
      className={`custom-dropdown ${isOpen ? 'custom-dropdown--open' : ''} ${className}`}
      ref={dropdownRef}
    >
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        className="custom-dropdown__button"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedOption?.label || placeholder}
        id={id}
      >
        <div className="custom-dropdown__button-content">
          {icon && (
            <span className="custom-dropdown__icon">
              {icon}
            </span>
          )}
          <span className="custom-dropdown__selected">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <FiChevronDown 
          className={`custom-dropdown__chevron ${isOpen ? 'custom-dropdown__chevron--open' : ''}`}
          size={16}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="custom-dropdown__menu" role="listbox">
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isFocused = index === focusedIndex

            return (
              <button
                key={option.value}
                type="button"
                className={`custom-dropdown__option ${
                  isSelected ? 'custom-dropdown__option--selected' : ''
                } ${
                  isFocused ? 'custom-dropdown__option--focused' : ''
                }`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {option.label}
                {isSelected && (
                  <span className="custom-dropdown__check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Dropdown

