import { lazy } from 'react'

/**
 * A wrapper around React.lazy that reloads the page if the module fails to load.
 * This is useful for handling chunk load errors (404s) after a new deployment.
 * 
 * @param {Function} componentImport - The dyamic import function, e.g. () => import('./MyComponent')
 * @returns {React.LazyExoticComponent} - The lazy loaded component
 */
export const lazyWithRetry = (componentImport) => {
    return lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        )

        try {
            const component = await componentImport()

            // If successful and we had previously refreshed, clear the flag
            if (pageHasAlreadyBeenForceRefreshed) {
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'false')
            }

            return component
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Assuming that the user is not on the latest version of the application.
                // Let's refresh the page immediately.
                console.error('Chunk load failed, reloading page...', error)
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true')
                window.location.reload()

                // Return a never-resolving promise to prevent React from throwing the error
                // while the page is reloading
                return new Promise(() => { })
            }

            // If we've already reloaded and it still fails, throw the error
            // so the ErrorBoundary can catch it
            console.error('Chunk load failed after refresh.', error)
            throw error
        }
    })
}
