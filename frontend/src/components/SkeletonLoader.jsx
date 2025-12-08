import './SkeletonLoader.css'

/**
 * Skeleton Loader Component
 * Shows loading placeholders for form fields
 */
function SkeletonLoader({ type = 'input', count = 1, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div className={`skeleton-loader ${className}`}>
      {items.map((item) => (
        <div key={item} className={`skeleton-item skeleton-${type}`}>
          {type === 'input' && (
            <>
              <div className="skeleton-label"></div>
              <div className="skeleton-field"></div>
            </>
          )}
          {type === 'button' && <div className="skeleton-button"></div>}
          {type === 'card' && (
            <>
              <div className="skeleton-card-header"></div>
              <div className="skeleton-card-content"></div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default SkeletonLoader

