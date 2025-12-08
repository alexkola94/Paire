import React from 'react'
import { useTranslation } from 'react-i18next'
import './LogoLoader.css'

/**
 * LogoLoader Component
 * 
 * A smooth, branded loading animation using the Paire logo.
 * Features:
 * - Smooth rotation and pulse animations
 * - Responsive sizing (mobile, tablet, desktop)
 * - Theme-aware colors
 * - Accessible with ARIA labels
 * 
 * @param {Object} props
 * @param {string} props.size - Size variant: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.text - Optional loading text to display below logo
 * @param {boolean} props.fullScreen - If true, renders as full-screen loading overlay
 * @param {string} props.className - Additional CSS classes
 */
const LogoLoader = ({ 
  size = 'medium', 
  text = null, 
  fullScreen = false,
  className = '' 
}) => {
  const { t } = useTranslation()

  // Use provided text or default translation
  const loadingText = text || t('common.loading', 'Loading...')

  // Determine size classes
  const sizeClass = `logo-loader--${size}`
  const containerClass = fullScreen 
    ? 'logo-loader-container logo-loader-container--fullscreen' 
    : 'logo-loader-container'

  return (
    <div className={`${containerClass} ${className}`} role="status" aria-live="polite">
      <div className={`logo-loader ${sizeClass}`}>
        {/* Logo with smooth animations */}
        <div className="logo-loader__wrapper">
          <img 
            src="/paire-logo.svg" 
            alt="Paire Logo" 
            className="logo-loader__image"
            width="80"
            height="80"
          />
          {/* Animated ring around logo */}
          <div className="logo-loader__ring"></div>
        </div>
        
        {/* Optional loading text */}
        {text !== false && (
          <p className="logo-loader__text">{loadingText}</p>
        )}
      </div>
    </div>
  )
}

export default LogoLoader

