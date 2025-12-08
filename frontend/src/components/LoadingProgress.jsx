import './LoadingProgress.css'

/**
 * Loading Progress Component
 * Shows progress indicator during form submission
 */
function LoadingProgress({ progress = 0, message = 'Saving...' }) {
  return (
    <div className="loading-progress">
      <div className="loading-progress-content">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        {message && <p className="loading-message">{message}</p>}
        {progress > 0 && progress < 100 && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoadingProgress

