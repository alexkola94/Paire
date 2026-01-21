import { useState, Suspense, lazy } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTravelMode } from './context/TravelModeContext'
import { useTheme } from '../context/ThemeContext'
import TravelLayout from './components/TravelLayout'
import LogoLoader from '../components/LogoLoader'

// Lazy load travel pages for code splitting
const TravelHome = lazy(() => import('./pages/TravelHome'))
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'))
const PackingPage = lazy(() => import('./pages/PackingPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))

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
 * Travel App Entry Point
 * Full-screen travel mode with internal navigation
 */
const TravelApp = () => {
  const [activePage, setActivePage] = useState('home')
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false)
  const { activeTrip, tripLoading } = useTravelMode()
  const { theme } = useTheme()

  // Dynamic loader accent class based on current theme
  // Keeps logic simple and lets CSS handle the actual color tokens.
  const loaderAccentClass =
    theme === 'dark' ? 'logo-loader-accent--dark' : 'logo-loader-accent--light'

  // Map page IDs to components
  const pageComponents = {
    home: TravelHome,
    budget: BudgetPage,
    itinerary: ItineraryPage,
    packing: PackingPage,
    documents: DocumentsPage,
    explore: ExplorePage
  }

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
      </Suspense>
    </TravelLayout>
  )
}

export default TravelApp
