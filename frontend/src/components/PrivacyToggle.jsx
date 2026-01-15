/**
 * PrivacyToggle Component
 * A toggle button to show/hide financial numbers across the app
 * Uses eye icons to indicate the current state
 */
import { useTranslation } from 'react-i18next'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './PrivacyToggle.css'

/**
 * PrivacyToggle - Renders a button to toggle privacy mode
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size: 'small', 'medium', 'large'
 * @param {boolean} showLabel - Whether to show the text label
 */
function PrivacyToggle({ className = '', size = 'medium', showLabel = false }) {
    const { t } = useTranslation()
    const { isPrivate, togglePrivacy } = usePrivacyMode()

    // Icon sizes based on size prop
    const iconSizes = {
        small: 16,
        medium: 20,
        large: 24
    }

    const iconSize = iconSizes[size] || iconSizes.medium

    return (
        <button
            type="button"
            onClick={togglePrivacy}
            className={`privacy-toggle privacy-toggle--${size} ${isPrivate ? 'privacy-toggle--hidden' : 'privacy-toggle--visible'} ${className}`}
            aria-label={isPrivate ? t('privacy.showNumbers', 'Show numbers') : t('privacy.hideNumbers', 'Hide numbers')}
            aria-pressed={isPrivate}
            title={isPrivate ? t('privacy.showNumbers', 'Show numbers') : t('privacy.hideNumbers', 'Hide numbers')}
        >
            {isPrivate ? (
                <>
                    <FiEyeOff size={iconSize} />
                    {showLabel && (
                        <span className="privacy-toggle__label">
                            {t('privacy.showNumbers', 'Show')}
                        </span>
                    )}
                </>
            ) : (
                <>
                    <FiEye size={iconSize} />
                    {showLabel && (
                        <span className="privacy-toggle__label">
                            {t('privacy.hideNumbers', 'Hide')}
                        </span>
                    )}
                </>
            )}
        </button>
    )
}

export default PrivacyToggle
