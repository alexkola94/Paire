import { useState, useEffect, useRef } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

/**
 * Pull to Refresh Wrapper Component
 * Uses native touch events to detecting pulling down from top
 * 
 * @param {Function} onRefresh - Async function to call on refresh
 * @param {ReactNode} children - Content to wrap
 * @param {string} className - Optional class name
 */
const PullToRefresh = ({ onRefresh, children, className = '', ...props }) => {
    const [startY, setStartY] = useState(0)
    const [currentY, setCurrentY] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [pullProgress, setPullProgress] = useState(0)
    const contentRef = useRef(null)

    const THRESHOLD = 80
    const MAX_PULL = 150

    useEffect(() => {
        const handleTouchStart = (e) => {
            // Only enable if we are at the top of the page
            if (window.scrollY <= 0) {
                setStartY(e.touches[0].clientY)
            }
        }

        const handleTouchMove = (e) => {
            if (startY === 0 || refreshing) return

            const touchY = e.touches[0].clientY
            const deltaY = touchY - startY

            // Only allow pulling down if at top
            if (window.scrollY <= 0 && deltaY > 0) {
                // Prevent native scroll if we are pulling to refresh
                if (deltaY < MAX_PULL && e.cancelable) {
                    // e.preventDefault() // Cannot default prevent passive listener, handling via style
                }

                // Add resistance
                const newY = Math.min(deltaY * 0.5, MAX_PULL) // 0.5 friction
                setCurrentY(newY)
                setPullProgress(Math.min(newY / THRESHOLD, 1))
            }
        }

        const handleTouchEnd = async () => {
            if (startY === 0 || refreshing) return

            if (currentY > THRESHOLD) {
                setRefreshing(true)
                setCurrentY(THRESHOLD) // Snap to threshold

                try {
                    // Trigger refresh
                    await onRefresh()
                } catch (err) {
                    console.error('Refresh failed', err)
                } finally {
                    setTimeout(() => {
                        setRefreshing(false)
                        setCurrentY(0)
                        setPullProgress(0)
                    }, 500) // Minimum show time
                }
            } else {
                // Snap back
                setCurrentY(0)
                setPullProgress(0)
            }

            setStartY(0)
        }

        // Add non-passive listeners to allow preventing default if needed (though avoiding preventDefault is better for performance)
        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [startY, currentY, refreshing, onRefresh])

    return (
        <div
            className={`pull-to-refresh-container ${className}`}
            {...props}
            style={{
                transform: `translateY(${currentY}px)`,
                transition: refreshing ? 'transform 0.3s ease' : currentY === 0 ? 'transform 0.3s ease' : 'none'
            }}
        >
            <div
                className="refresh-indicator"
                style={{
                    height: `${THRESHOLD}px`,
                    marginTop: `-${THRESHOLD}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: Math.max(pullProgress, 0.3),
                    position: 'absolute',
                    width: '100%',
                    top: 0
                }}
            >
                <div
                    className={`spinner-icon ${refreshing ? 'spinning' : ''}`}
                    style={{
                        transform: `rotate(${pullProgress * 360}deg)`,
                        color: pullProgress >= 1 ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                >
                    <FiRefreshCw size={24} />
                </div>
            </div>

            <div ref={contentRef}>
                {children}
            </div>
        </div>
    )
}

export default PullToRefresh
