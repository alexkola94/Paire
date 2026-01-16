import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiWifiOff } from 'react-icons/fi'
import { motion } from 'framer-motion'

/**
 * Offline Indicator Component
 * Shows a banner when the app is offline
 */
const OfflineIndicator = memo(() => {
  const { t } = useTranslation()

  return (
    <motion.div
      className="offline-indicator"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <FiWifiOff size={16} />
      <span>{t('travel.common.offline', 'Offline - Changes will sync when online')}</span>
    </motion.div>
  )
})

OfflineIndicator.displayName = 'OfflineIndicator'

export default OfflineIndicator
