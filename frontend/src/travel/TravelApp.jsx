import { useState, Suspense, lazy, useEffect, useCallback, useMemo } from 'react'
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

// Page ID to lazy component map (module-level to avoid recreating on every render)
const PAGE_COMPONENTS = {
  home: TravelHome,
  budget: BudgetPage,
  itinerary: ItineraryPage,
  packing: PackingPage,
  documents: DocumentsPage,
  explore: ExplorePage,
  notifications: TravelNotificationSettings
}

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

  // Loader accent class from theme (memoized to keep stable when theme unchanged)
  const loaderAccentClass = useMemo(
    () => (theme === 'dark' ? 'logo-loader-accent--dark' : 'logo-loader-accent--light'),
    [theme]
  )

  // Sync notification context with active trip
  useEffect(() => {
    if (activeTrip?.id) {
      setTripContext(activeTrip.id)
    }
  }, [activeTrip?.id, setTripContext])

  // Stable callback for navigation (enables memoized page components to skip re-renders)
  const onNavigate = useCallback((page) => setActivePage(page), [])

  // Resolve active component for non-home pages from module-level map
  const ActiveComponent = PAGE_COMPONENTS[activePage] || TravelHome

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
      onNavigate={onNavigate}
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
        {/* Option A: Only mount the active page. TravelHome unmounts when navigating away,
            so its effects (geolocation, route distances, advisories) stop; remounts on return. */}
        <AnimatePresence mode="wait">
          {activePage === 'home' ? (
            <motion.div
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="travel-page-container travel-page-container--home"
            >
              <TravelHome
                trip={activeTrip}
                onNavigate={onNavigate}
                isLayoutSettingsOpen={isLayoutSettingsOpen}
                setIsLayoutSettingsOpen={setIsLayoutSettingsOpen}
              />
            </motion.div>
          ) : (
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
                onNavigate={onNavigate}
                isLayoutSettingsOpen={isLayoutSettingsOpen}
                setIsLayoutSettingsOpen={setIsLayoutSettingsOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
