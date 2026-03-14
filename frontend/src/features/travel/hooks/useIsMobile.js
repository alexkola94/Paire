import { useState, useEffect } from 'react'

const useIsMobile = (breakpoint = 768) => {
    // Initialize with actual window width check to avoid flash
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth <= breakpoint
        }
        return false
    })

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= breakpoint)
        }

        // Check initially (in case SSR value differs)
        checkIsMobile()

        // Add listener
        window.addEventListener('resize', checkIsMobile)

        // Cleanup
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [breakpoint])

    return isMobile
}

export default useIsMobile
