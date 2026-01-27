import { useState, useEffect } from 'react'

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= breakpoint)
        }

        // Check initially
        checkIsMobile()

        // Add listener
        window.addEventListener('resize', checkIsMobile)

        // Cleanup
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [breakpoint])

    return isMobile
}

export default useIsMobile
