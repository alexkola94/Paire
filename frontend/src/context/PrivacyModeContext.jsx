/**
 * PrivacyModeContext
 * Provides global state management for privacy/hide numbers feature
 * Allows users to toggle visibility of financial amounts across the app
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { reminderService } from '../services/api'

// Create the context
const PrivacyModeContext = createContext()

/**
 * PrivacyModeProvider Component
 * Wraps the app to provide privacy mode state and functions
 */
export const PrivacyModeProvider = ({ children }) => {
    // Initialize from localStorage first for fast UI, then sync from backend
    const [isPrivate, setIsPrivate] = useState(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('privacyMode') : null
        return saved === 'true'
    })

    // On mount, try to load persisted preference from backend (per-user)
    useEffect(() => {
        let isMounted = true
        const loadPreference = async () => {
            try {
                const prefs = await reminderService.getSettings()
                if (prefs && typeof prefs.privacyHideNumbers === 'boolean' && isMounted) {
                    setIsPrivate(prefs.privacyHideNumbers)
                    localStorage.setItem('privacyMode', String(prefs.privacyHideNumbers))
                }
            } catch (err) {
                // Silent fail – fall back to localStorage-only
                // console.warn('Failed to load privacy preference', err)
            }
        }
        loadPreference()
        return () => {
            isMounted = false
        }
    }, [])

    /**
     * Toggle privacy mode on/off
     * Persists the setting to localStorage
     */
    const togglePrivacy = useCallback(() => {
        setIsPrivate(prev => {
            const newValue = !prev
            // Optimistic update: persist to localStorage immediately
            localStorage.setItem('privacyMode', String(newValue))

            // Fire-and-forget backend persistence
            try {
                reminderService.updateSettings({ privacyHideNumbers: newValue })
            } catch {
                // Ignore errors, user still has local preference
            }

            return newValue
        })
    }, [])

    /**
     * Mask an amount if privacy mode is enabled
     * @param {string|number} formattedAmount - The formatted currency string or number
     * @param {string} placeholder - The placeholder to show when hidden (default: '••••••')
     * @returns {string} - Either the original amount or the masked placeholder
     */
    const maskAmount = useCallback((formattedAmount, placeholder = '••••••') => {
        if (isPrivate) {
            return placeholder
        }
        return formattedAmount
    }, [isPrivate])

    /**
     * Create a masked currency formatter
     * Wraps an existing formatter to add privacy masking
     * @param {Function} formatter - The original currency formatter function
     * @returns {Function} - A wrapped formatter that respects privacy mode
     */
    const createMaskedFormatter = useCallback((formatter) => {
        return (amount, placeholder = '••••••') => {
            if (isPrivate) {
                return placeholder
            }
            return formatter(amount)
        }
    }, [isPrivate])

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        isPrivate,
        togglePrivacy,
        maskAmount,
        createMaskedFormatter
    }), [isPrivate, togglePrivacy, maskAmount, createMaskedFormatter])

    return (
        <PrivacyModeContext.Provider value={contextValue}>
            {children}
        </PrivacyModeContext.Provider>
    )
}

/**
 * Custom hook to use privacy mode context
 * @returns {Object} - { isPrivate, togglePrivacy, maskAmount, createMaskedFormatter }
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePrivacyMode = () => {
    const context = useContext(PrivacyModeContext)
    if (context === undefined) {
        throw new Error('usePrivacyMode must be used within a PrivacyModeProvider')
    }
    return context
}

export default PrivacyModeContext
