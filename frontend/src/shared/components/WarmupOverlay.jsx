import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useWarmup } from '../context/WarmupContext'
import './WarmupOverlay.css'

const MESSAGE_ROTATE_MS = 4000

/**
 * Full-screen overlay shown while Render.com services are cold-starting.
 * Displays a calming, branded loading experience with rotating messages
 * so users aren't confused by the ~30-60s wait.
 */
function WarmupOverlay() {
  const { t } = useTranslation()
  const { isWarmingUp } = useWarmup()
  const [msgIndex, setMsgIndex] = useState(0)

  const messages = [
    t('warmup.message1', 'Waking up your personal finance assistant...'),
    t('warmup.message2', 'Almost there, just a few more seconds...'),
    t('warmup.message3', 'Setting things up for you...'),
    t('warmup.message4', 'Preparing your financial dashboard...'),
  ]

  useEffect(() => {
    if (!isWarmingUp) {
      setMsgIndex(0)
      return
    }
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length)
    }, MESSAGE_ROTATE_MS)
    return () => clearInterval(interval)
  }, [isWarmingUp, messages.length])

  if (!isWarmingUp) return null

  return createPortal(
    <div className="warmup-overlay" role="status" aria-live="polite">
      <div className="warmup-overlay__card">
        <div className="warmup-overlay__logo-wrapper">
          <img
            src={`${import.meta.env.BASE_URL}paire-logo.svg`}
            alt="Paire"
            className="warmup-overlay__logo"
            width="80"
            height="80"
          />
          <div className="warmup-overlay__ring" />
        </div>

        <div className="warmup-overlay__text-area">
          <p className="warmup-overlay__message" key={msgIndex}>
            {messages[msgIndex]}
          </p>
          <p className="warmup-overlay__sub">
            {t('warmup.subtitle', 'This only takes a moment')}
          </p>
        </div>

        <div className="warmup-overlay__progress">
          <div className="warmup-overlay__progress-bar" />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default WarmupOverlay
