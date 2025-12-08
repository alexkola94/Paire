import './FormLayout.css'

/**
 * Form Layout Component
 * Provides responsive grid layouts for form fields
 * - Single column on mobile
 * - Two columns on tablet
 * - Two/three columns on desktop
 */
function FormLayout({ 
  children, 
  columns = 'auto',
  gap = 'lg',
  className = ''
}) {
  const columnClass = columns === 'auto' 
    ? 'form-layout-auto' 
    : `form-layout-${columns}`
  
  const gapClass = `form-layout-gap-${gap}`

  return (
    <div className={`form-layout ${columnClass} ${gapClass} ${className}`}>
      {children}
    </div>
  )
}

export default FormLayout

