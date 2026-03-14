import { memo } from 'react'
import { FiPhone, FiInfo } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/**
 * Emergency Info Card
 * Shows local emergency numbers in a simple, tappable list.
 * If a country exposes a universal/general emergency number (e.g. 112),
 * we surface it first so travellers always see the most reliable option.
 */
const EmergencyCard = memo(({ data }) => {
    const { t } = useTranslation()

    if (!data) return null

    const { countryName, emergency } = data

    // Build a small, explicit list so the layout stays predictable
    const emergencyItems = [
        emergency?.general && {
            key: 'general',
            number: emergency.general
        },
        emergency?.police && {
            key: 'police',
            number: emergency.police
        },
        emergency?.ambulance && {
            key: 'ambulance',
            number: emergency.ambulance
        },
        emergency?.fire && {
            key: 'fire',
            number: emergency.fire
        }
    ].filter(Boolean)

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
                {emergencyItems.map((item) => (
                    <a
                        key={item.key}
                        href={`tel:${item.number}`}
                        className={`emergency-item${item.key === 'general' ? ' emergency-item-primary' : ''}`}
                    >
                        <span className="label">
                            {t(`travel.emergency.${item.key}`, item.key)}
                        </span>
                        <span className="number">{item.number}</span>
                    </a>
                ))}
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
