import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import './FormSection.css'

/**
 * Form Section Component
 * Features:
 * - Groups related form fields
 * - Optional collapsible sections
 * - Visual separators
 * - Better organization
 */
function FormSection({ 
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!title && !collapsible) {
    // Simple wrapper without title
    return (
      <div className={`form-section ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`form-section ${collapsible ? 'collapsible' : ''} ${className}`}>
      {title && (
        <div 
          className="form-section-header"
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }
          } : undefined}
        >
          <h3 className="form-section-title">{title}</h3>
          {collapsible && (
            <div className="form-section-toggle">
              {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </div>
          )}
        </div>
      )}
      
      {(!collapsible || isExpanded) && (
        <div className="form-section-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default FormSection

