import { useEffect, useRef } from 'react'

/**
 * Automatically scrolls an element into view when an expanded flag becomes true.
 * This is useful for "View All" sections that might push content off-screen.
 * 
 * @param {boolean} isExpanded - The state flag that triggers expansion
 * @param {React.RefObject} ref - Ref to the container or element to scroll to/keep in view
 * @param {Object} options - ScrollIntoView options
 */
const useScrollOnExpand = (isExpanded, ref, options = { behavior: 'smooth', block: 'nearest' }) => {
    // We use a ref to track if it's the initial mount so we don't scroll on first render
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        if (isExpanded && ref?.current) {
            // Small timeout to allow the DOM to update with the new content size
            const timer = setTimeout(() => {
                ref.current.scrollIntoView(options)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [isExpanded, ref, options])
}

export default useScrollOnExpand
