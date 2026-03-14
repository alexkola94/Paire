import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLogout } from '../context/LogoutContext'
import './LogoutLoadingOverlay.css'

/**
 * Full-screen overlay shown while the user is logging out.
 * Displays Paire branding and "Logging out..." so the user sees clear feedback.
 */
function LogoutLoadingOverlay() {
  const { t } = useTranslation()
  const { isLoggingOut } = useLogout()

  if (!isLoggingOut) return null

  return createPortal(
    <div
      className="logout-overlay"
      role="status"
      aria-live="polite"
      aria-label={t('auth.loggingOut', 'Logging out...')}
    >
      <div className="logout-overlay__card">
        <div className="logout-overlay__logo-wrapper">
          <img
            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
            alt="Paire"
            className="logout-overlay__logo"
            width="80"
            height="80"
          />
          <div className="logout-overlay__ring" aria-hidden="true" />
        </div>

        <div className="logout-overlay__text-area">
          <p className="logout-overlay__app-name">Paire</p>
          <p className="logout-overlay__message">
            {t('auth.loggingOut', 'Logging out...')}
          </p>
        </div>

        <div className="logout-overlay__progress" aria-hidden="true">
          <div className="logout-overlay__progress-bar" />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LogoutLoadingOverlay
