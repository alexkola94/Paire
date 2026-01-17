import { memo } from 'react'
import { FiPhone, FiInfo } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/**
 * Emergency Info Card
 * Shows local emergency numbers
 */
const EmergencyCard = memo(({ data }) => {
    const { t } = useTranslation()

    if (!data) return null

    const { countryName, emergency } = data

    return (
        <motion.div
            className="explore-card emergency-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="card-header">
                <div className="card-icon error-bg">
                    <FiPhone size={20} />
                </div>
                <div className="card-title">
                    <h3>{t('travel.emergency.title', 'Emergency Info')}</h3>
                    <span className="card-subtitle">{countryName}</span>
                </div>
            </div>

            <div className="emergency-numbers">
                <a href={`tel:${emergency.police}`} className="emergency-item">
                    <span className="label">{t('travel.emergency.police', 'Police')}</span>
                    <span className="number">{emergency.police}</span>
                </a>
                <a href={`tel:${emergency.ambulance}`} className="emergency-item">
                    <span className="label">{t('travel.emergency.ambulance', 'Ambulance')}</span>
                    <span className="number">{emergency.ambulance}</span>
                </a>
                <a href={`tel:${emergency.fire}`} className="emergency-item">
                    <span className="label">{t('travel.emergency.fire', 'Fire')}</span>
                    <span className="number">{emergency.fire}</span>
                </a>
            </div>

            <div className="emergency-note">
                <FiInfo size={12} />
                <span>{t('travel.emergency.note', 'Tap numbers to call immediately')}</span>
            </div>
        </motion.div>
    )
})

EmergencyCard.displayName = 'EmergencyCard'
export default EmergencyCard
