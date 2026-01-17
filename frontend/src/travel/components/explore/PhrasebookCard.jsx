import { memo, useState } from 'react'
import { FiMessageSquare, FiVolume2, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

/**
 * Phrasebook Card
 * Shows essential local phrases
 */
const PhrasebookCard = memo(({ data }) => {
    const { t } = useTranslation()
    const [activePhrase, setActivePhrase] = useState(null)
    const [showAllPhrases, setShowAllPhrases] = useState(false)

    if (!data || !data.phrasebook) return null

    const { phrasebook } = data
    const phrases = Object.entries(phrasebook).filter(([key]) => key !== 'language')
    const displayedPhrases = showAllPhrases ? phrases : phrases.slice(0, 4)

    return (
        <>
            <motion.div
                className="explore-card phrasebook-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="card-header">
                    <div className="card-icon primary-bg">
                        <FiMessageSquare size={20} />
                    </div>
                    <div className="card-title">
                        <h3>{t('travel.phrasebook.title', 'Local Lingo')}</h3>
                        <span className="card-subtitle">
                            {t('travel.phrasebook.language', '{{lang}} Essentials', { lang: phrasebook.language || 'English' })}
                        </span>
                    </div>
                </div>

                <div className="phrasebook-list">
                    {displayedPhrases.map(([key, value]) => (
                        <div key={key} className="phrase-item">
                            <span className="phrase-key">{t(`travel.phrasebook.${key}`, key.replace('_', ' '))}</span>
                            <span className="phrase-value">{value}</span>
                        </div>
                    ))}
                </div>

                {phrases.length > 4 && (
                    <button 
                        className="view-more-btn"
                        onClick={() => setShowAllPhrases(!showAllPhrases)}
                    >
                        {showAllPhrases 
                            ? t('common.showLess', 'Show Less')
                            : t('travel.common.viewAll', 'View All')}
                    </button>
                )}
            </motion.div>
        </>
    )
})

PhrasebookCard.displayName = 'PhrasebookCard'
export default PhrasebookCard
