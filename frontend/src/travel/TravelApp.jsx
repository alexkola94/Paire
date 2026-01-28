import { useState, Suspense, lazy, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTravelMode } from './context/TravelModeContext'
import { useTheme } from '../context/ThemeContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import TravelLayout from './components/TravelLayout'
import LogoLoader from '../components/LogoLoader'

// Lazy load travel pages for code splitting
const TravelHome = lazy(() => import('./pages/TravelHome'))
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'))
const PackingPage = lazy(() => import('./pages/PackingPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const TravelNotificationSettings = lazy(() => import('./pages/TravelNotificationSettings'))

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

/**
 * Inner Travel App Component
 * Separated to allow notification context usage
 */
const TravelAppContent = () => {
  const [activePage, setActivePage] = useState('home')
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false)
  const { activeTrip, tripLoading } = useTravelMode()
  const { theme } = useTheme()
  const { setTripContext } = useNotifications()

  // Dynamic loader accent class based on current theme
  const loaderAccentClass =
    theme === 'dark' ? 'logo-loader-accent--dark' : 'logo-loader-accent--light'

  // Sync notification context with active trip
  useEffect(() => {
    if (activeTrip?.id) {
      setTripContext(activeTrip.id)
    }
  }, [activeTrip?.id, setTripContext])

  // Map page IDs to components
  const pageComponents = {
    home: TravelHome,
    budget: BudgetPage,
    itinerary: ItineraryPage,
    packing: PackingPage,
    documents: DocumentsPage,
    explore: ExplorePage,
    notifications: TravelNotificationSettings
  }

  // For non-home pages, resolve the active component (used only when activePage !== 'home')
  const ActiveComponent = pageComponents[activePage] || TravelHome

  // Show loading while checking for active trip
  if (tripLoading) {
    return (
      <div className="travel-loading-light">
        <LogoLoader
          size="large"
          fullScreen
          className={loaderAccentClass}
        />
      </div>
    )
  }

  return (
    <TravelLayout
      activePage={activePage}
      onNavigate={setActivePage}
      shouldHideNav={isLayoutSettingsOpen}
    >
      <Suspense
        fallback={
          <div className="travel-page-loading travel-loading-light">
            <LogoLoader
              size="medium"
              className={loaderAccentClass}
            />
          </div>
        }
      >
        {/* Option A: Keep TravelHome mounted and toggle visibility so it does not remount
            when returning from Explore/Budget/etc. Avoids PWA mobile flicker. */}
        {/* Persistent TravelHome – always mounted, visible only when activePage === 'home' */}
        <div
          className="travel-page-container travel-page-container--home"
          style={{ display: activePage === 'home' ? 'block' : 'none' }}
          aria-hidden={activePage !== 'home'}
        >
          <TravelHome
            trip={activeTrip}
            onNavigate={setActivePage}
            isLayoutSettingsOpen={isLayoutSettingsOpen}
            setIsLayoutSettingsOpen={setIsLayoutSettingsOpen}
          />
        </div>
        {/* Other pages – only one visible at a time; animate when switching between them */}
        {activePage !== 'home' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="travel-page-container"
            >
              <ActiveComponent
                trip={activeTrip}
                onNavigate={setActivePage}
                isLayoutSettingsOpen={isLayoutSettingsOpen}
                setIsLayoutSettingsOpen={setIsLayoutSettingsOpen}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </Suspense>
    </TravelLayout>
  )
}

/**
 * Travel App Entry Point
 * Full-screen travel mode with internal navigation
 * Wrapped with NotificationProvider for notification state management
 */
const TravelApp = () => {
  return (
    <NotificationProvider>
      <TravelAppContent />
    </NotificationProvider>
  )
}

export default TravelApp
