import { BrowserRouter as Router } from 'react-router-dom'
import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { authService } from '../features/auth/services/auth'
import { sessionManager } from '../shared/services/sessionManager'
import { getCsrfToken } from '../shared/services/csrf'
import { isTokenExpired } from '../shared/utils/tokenUtils'
import { ThemeProvider } from '../shared/context/ThemeContext'
import { AccessibilityProvider } from '../shared/context/AccessibilityContext'
import { PrivacyModeProvider } from '../shared/context/PrivacyModeContext'
import { ModalProvider } from '../shared/context/ModalContext'
import { CalculatorProvider } from '../shared/context/CalculatorContext'
import { WarmupProvider } from '../shared/context/WarmupContext'
import { LogoutProvider } from '../shared/context/LogoutContext'
import { TravelModeProvider, useTravelMode } from '../features/travel/context/TravelModeContext'
import LogoLoader from '../shared/components/LogoLoader'
import WarmupOverlay from '../shared/components/WarmupOverlay'
import LogoutLoadingOverlay from '../shared/components/LogoutLoadingOverlay'
import AirplaneTransition from '../shared/components/AirplaneTransition'
import { ToastProvider } from '../shared/components/Toast'
import { warmUpApis } from '../shared/utils/warmupService'
import { MainAppRoutes } from './routes'
import CookieConsent from '../shared/components/CookieConsent'

const TravelApp = lazy(() => import('../features/travel/TravelApp'))

getCsrfToken().catch(() => { /* non-blocking */ })
warmUpApis()

function AppContent({ session }) {
  const {
    isTravelMode,
    isTransitioning,
    transitionDirection,
    completeTransition,
    activeTrip,
    pendingTrip
  } = useTravelMode()

  const transitionDestination = transitionDirection === 'takeoff'
    ? pendingTrip || activeTrip
    : { latitude: 37.9838, longitude: 23.7275, destination: 'Athens, Greece' }

  const destination = transitionDestination ? {
    latitude: transitionDestination.latitude,
    longitude: transitionDestination.longitude,
    name: transitionDestination.destination
  } : null

  const contentVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    }
  }

  return (
    <>
      <AirplaneTransition
        isVisible={isTransitioning}
        direction={transitionDirection}
        onComplete={completeTransition}
        destination={destination}
      />
      <AnimatePresence mode="wait">
        {isTravelMode && session ? (
          <motion.div
            key="travel-app"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={<LogoLoader size="large" fullScreen />}>
              <TravelApp />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <Router basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <CookieConsent />
              <MainAppRoutes session={session} />
            </Router>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const redirectingRef = useRef(false)
  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    const checkSession = async () => {
      if (sessionStorage.getItem('auth_prevent_autologin')) {
        setSession(null)
        sessionRef.current = null
        setLoading(false)
        return
      }

      try {
        const sess = await authService.getSession()
        setSession(sess)
        sessionRef.current = sess
      } catch (error) {
        console.error('Session check error:', error)
        setSession(null)
        sessionRef.current = null
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const tokenExpirationChecker = setInterval(() => {
      const token = sessionManager.getToken()
      if (token && isTokenExpired(token)) {
        console.warn('Token expired detected by periodic checker')
        sessionManager.clearSession(false)
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: { reason: 'Session expired' }
        }))
      }
    }, 5 * 60 * 1000)

    const handleSessionInvalidated = (e) => {
      if (redirectingRef.current) return
      if (!sessionRef.current) return

      redirectingRef.current = true
      setSession(null)
      sessionRef.current = null

      const currentPath = window.location.pathname
      const basename = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL
      const loginPath = `${basename}/login`

      if (currentPath !== loginPath && !currentPath.endsWith('/login')) {
        window.location.replace(loginPath)
      } else {
        setTimeout(() => {
          redirectingRef.current = false
        }, 1000)
      }
    }

    const handleSessionChange = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 50))
        const sess = await authService.getSession()
        setSession(sess)
        sessionRef.current = sess
      } catch (error) {
        console.error('Session refresh error:', error)
        setSession(null)
        sessionRef.current = null
      }
    }

    window.addEventListener('session-invalidated', handleSessionInvalidated)
    window.addEventListener('auth-storage-change', handleSessionChange)

    return () => {
      window.removeEventListener('session-invalidated', handleSessionInvalidated)
      window.removeEventListener('auth-storage-change', handleSessionChange)
      clearInterval(tokenExpirationChecker)
    }
  }, [])

  if (loading) {
    return <LogoLoader size="large" fullScreen />
  }

  return (
    <ThemeProvider>
      <WarmupProvider>
        <AccessibilityProvider>
          <PrivacyModeProvider>
            <ModalProvider>
              <TravelModeProvider>
                <ToastProvider>
                  <CalculatorProvider>
                    <LogoutProvider>
                      <AppContent session={session} />
                      <WarmupOverlay />
                      <LogoutLoadingOverlay />
                    </LogoutProvider>
                  </CalculatorProvider>
                </ToastProvider>
              </TravelModeProvider>
            </ModalProvider>
          </PrivacyModeProvider>
        </AccessibilityProvider>
      </WarmupProvider>
    </ThemeProvider>
  )
}

export default App
