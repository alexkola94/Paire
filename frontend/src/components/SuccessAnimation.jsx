import { useEffect, useState } from 'react'
import { FiCheck } from 'react-icons/fi'
import './SuccessAnimation.css'

/**
 * Success Animation Component
 * Displays a celebratory animation when form is successfully submitted
 */
function SuccessAnimation({ show, onComplete, message = 'Saved successfully!' }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setIsAnimating(true)

      // Complete animation after 0.8 seconds to match modal close timing
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          if (onComplete) {
            onComplete()
          }
        }, 300) // Wait for fade out
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className={`success-animation-overlay ${isAnimating ? 'animating' : 'fading'}`}>
      <div className="success-animation-content">
        <div className="success-icon-wrapper">
          <FiCheck className="success-icon" size={64} />
          <div className="success-ripple"></div>
          <div className="success-ripple delay-1"></div>
          <div className="success-ripple delay-2"></div>
        </div>
        <p className="success-message">{message}</p>
      </div>
    </div>
  )
}

export default SuccessAnimation

