import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { lazyWithRetry } from './lazyWithRetry'
import { render, screen, waitFor } from '@testing-library/react'
import React, { Suspense } from 'react'

// Mock the window location object
const mockReload = vi.fn()

describe('lazyWithRetry', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.sessionStorage.clear()

        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, reload: mockReload },
        })

        // Mock console.error to keep test output clean
        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders component normally when import succeeds', async () => {
        const MockComponent = () => <div>Loaded Successfully</div>
        const importFn = vi.fn().mockResolvedValue({ default: MockComponent })

        const LazyComponent = lazyWithRetry(importFn)

        render(
            <Suspense fallback={<div>Loading...</div>}>
                <LazyComponent />
            </Suspense>
        )

        expect(await screen.findByText('Loaded Successfully')).toBeInTheDocument()
        expect(mockReload).not.toHaveBeenCalled()
    })

    it('reloads page when import fails for the first time', async () => {
        const importFn = vi.fn().mockRejectedValue(new Error('Chunk load error'))

        const LazyComponent = lazyWithRetry(importFn)

        render(
            <Suspense fallback={<div>Loading...</div>}>
                <LazyComponent />
            </Suspense>
        )

        // Wait for the reloading logic to trigger
        await waitFor(() => {
            expect(mockReload).toHaveBeenCalledTimes(1)
        })

        expect(window.sessionStorage.getItem('page-has-been-force-refreshed')).toBe('true')
    })

    it('throws error when import fails after reload', async () => {
        // Simulate that we already reloaded
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true')

        const error = new Error('Chunk load error (persistent)')
        const importFn = vi.fn().mockRejectedValue(error)

        const LazyComponent = lazyWithRetry(importFn)

        // We expect it to throw, so we need to catch it or let ErrorBoundary handle it
        // For this test, we accept the rejection behavior

        // Create a wrapper to catch the error
        class ErrorBoundary extends React.Component {
            constructor(props) {
                super(props)
                this.state = { hasError: false }
            }
            static getDerivedStateFromError() {
                return { hasError: true }
            }
            render() {
                if (this.state.hasError) return <div>Caught Error</div>
                return this.props.children
            }
        }

        render(
            <ErrorBoundary>
                <Suspense fallback={<div>Loading...</div>}>
                    <LazyComponent />
                </Suspense>
            </ErrorBoundary>
        )

        expect(await screen.findByText('Caught Error')).toBeInTheDocument()
        expect(mockReload).not.toHaveBeenCalled()
    })
})
