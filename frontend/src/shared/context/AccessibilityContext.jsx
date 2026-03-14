import { createContext, useContext, useEffect, useState } from 'react'

const AccessibilityContext = createContext()

export const AccessibilityProvider = ({ children }) => {
    // Load settings from localStorage
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('accessibilityItems')
        return saved ? JSON.parse(saved) : {
            fontSize: 'normal', // normal, large, xl
            reducedMotion: false,
            highContrast: false
        }
    })

    // Apply settings to document root
    useEffect(() => {
        const root = document.documentElement

        // Font Size
        root.setAttribute('data-font-size', settings.fontSize)

        // Reduced Motion
        if (settings.reducedMotion) {
            root.setAttribute('data-motion', 'reduced')
        } else {
            root.removeAttribute('data-motion')
        }

        // High Contrast (can reuse existing logic or add specific attr)
        if (settings.highContrast) {
            root.setAttribute('data-contrast', 'high')
        } else {
            root.removeAttribute('data-contrast')
        }

        localStorage.setItem('accessibilityItems', JSON.stringify(settings))
    }, [settings])

    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }))
    }

    const resetSettings = () => {
        setSettings({
            fontSize: 'normal',
            reducedMotion: false,
            highContrast: false
        })
    }

    return (
        <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </AccessibilityContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAccessibility = () => {
    const context = useContext(AccessibilityContext)
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider') // i18n-ignore
    }
    return context
}
