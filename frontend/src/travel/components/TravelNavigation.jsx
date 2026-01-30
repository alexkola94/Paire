import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FiHome,
  FiDollarSign,
  FiCalendar,
  FiCheckSquare,
  FiFolder,
  FiCompass,
  FiMessageCircle
} from 'react-icons/fi'
import { useModal } from '../../context/ModalContext'
import '../styles/TravelLayout.css'

// Navigation items: page items navigate; guide opens the Travel Guide chatbot
const navItems = [
  { id: 'home', icon: FiHome, label: 'travel.nav.home' },
  { id: 'budget', icon: FiDollarSign, label: 'travel.nav.budget' },
  { id: 'itinerary', icon: FiCalendar, label: 'travel.nav.itinerary' },
  { id: 'packing', icon: FiCheckSquare, label: 'travel.nav.packing' },
  { id: 'documents', icon: FiFolder, label: 'travel.nav.documents' },
  { id: 'explore', icon: FiCompass, label: 'travel.nav.explore' },
  { id: 'guide', icon: FiMessageCircle, label: 'travel.nav.guide', opensChatbot: true }
]

/**
 * Travel Navigation Component
 * Bottom navigation bar: pages + Travel Guide (opens chatbot from nav)
 */
const TravelNavigation = memo(({ activePage, onNavigate, chatbotOpen, onOpenChatbot }) => {
  const { t } = useTranslation()
  const { hasOpenModals } = useModal()

  return (
    <nav className={`travel-nav ${hasOpenModals ? 'hidden' : ''}`}>
      <div className="travel-nav-container">
        {navItems.map((item, index) => {
          const opensChatbot = item.opensChatbot === true
          const isActive = opensChatbot ? chatbotOpen : activePage === item.id
          const Icon = item.icon

          return (
            <motion.button
              key={item.id}
              className={`travel-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => (opensChatbot ? onOpenChatbot() : onNavigate(item.id))}
              whileTap={{ scale: 0.9 }}
              aria-label={t(item.label)}
              aria-current={isActive ? 'page' : undefined}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: index * 0.1 + 0.2,
                type: 'spring',
                stiffness: 260,
                damping: 20
              }}
            >
              <div className="nav-icon-wrapper">
                <Icon size={22} />
                {isActive && (
                  <motion.div
                    className="nav-indicator"
                    layoutId="travel-nav-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="nav-label">{t(item.label)}</span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
})

TravelNavigation.displayName = 'TravelNavigation'

export default TravelNavigation
