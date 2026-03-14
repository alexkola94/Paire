
import { useLocation } from 'react-router-dom'
import './PageTransition.css'

/**
 * PageTransition Component
 * 
 * Provides smooth transitions between route changes to prevent white flashes.
 * Wraps the Outlet to add fade-in animations when routes change.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 */
const PageTransition = ({ children }) => {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
      className="page-transition"
    >
      {children}
    </div>
  )
}

export default PageTransition

