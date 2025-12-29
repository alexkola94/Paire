import { useState, useCallback, useEffect } from 'react'

/**
 * Default dashboard widget layout configuration
 * Grid is 12 columns wide, with responsive breakpoints
 */
const DEFAULT_LAYOUTS = {
    lg: [
        { i: 'summary-cards', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
        { i: 'quick-access', x: 0, y: 2, w: 8, h: 2, minW: 6, minH: 2 },
        { i: 'weekly-comparison', x: 8, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'budget-progress', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'savings-goals', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'upcoming-bills', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'expenses-widget', x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'income-widget', x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'loans-widget', x: 0, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'shopping-lists-widget', x: 4, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'recurring-bills-widget', x: 8, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'partnership-widget', x: 0, y: 16, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'analytics-widget', x: 4, y: 16, w: 8, h: 4, minW: 6, minH: 3 },
        { i: 'reminders-widget', x: 0, y: 19, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'achievements-widget', x: 4, y: 20, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'currency-calculator-widget', x: 8, y: 20, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'economic-news-widget', x: 0, y: 23, w: 12, h: 4, minW: 6, minH: 3 },
        { i: 'recent-transactions', x: 0, y: 27, w: 12, h: 5, minW: 6, minH: 4 }
    ],
    md: [
        { i: 'summary-cards', x: 0, y: 0, w: 10, h: 2, minW: 5, minH: 2 },
        { i: 'quick-access', x: 0, y: 2, w: 6, h: 2, minW: 5, minH: 2 },
        { i: 'weekly-comparison', x: 6, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'budget-progress', x: 0, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
        { i: 'savings-goals', x: 5, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
        { i: 'upcoming-bills', x: 0, y: 8, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'expenses-widget', x: 5, y: 8, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'income-widget', x: 0, y: 12, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'loans-widget', x: 5, y: 12, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'shopping-lists-widget', x: 0, y: 16, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'recurring-bills-widget', x: 5, y: 16, w: 5, h: 4, minW: 3, minH: 3 },
        { i: 'partnership-widget', x: 0, y: 20, w: 5, h: 3, minW: 3, minH: 2 },
        { i: 'analytics-widget', x: 5, y: 20, w: 5, h: 4, minW: 4, minH: 3 },
        { i: 'reminders-widget', x: 0, y: 23, w: 5, h: 3, minW: 3, minH: 2 },
        { i: 'achievements-widget', x: 5, y: 24, w: 5, h: 3, minW: 3, minH: 2 },
        { i: 'currency-calculator-widget', x: 0, y: 26, w: 5, h: 3, minW: 3, minH: 2 },
        { i: 'economic-news-widget', x: 5, y: 27, w: 5, h: 4, minW: 4, minH: 3 },
        { i: 'recent-transactions', x: 0, y: 31, w: 10, h: 5, minW: 5, minH: 4 }
    ],
    sm: [
        { i: 'summary-cards', x: 0, y: 0, w: 6, h: 4, minW: 6, minH: 2, isResizable: false },
        { i: 'quick-access', x: 0, y: 4, w: 6, h: 2, minW: 6, minH: 2, isResizable: false },
        { i: 'weekly-comparison', x: 0, y: 6, w: 6, h: 2, minW: 3, minH: 2, isResizable: false },
        { i: 'budget-progress', x: 0, y: 8, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'savings-goals', x: 0, y: 12, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'upcoming-bills', x: 0, y: 16, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'expenses-widget', x: 0, y: 20, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'income-widget', x: 0, y: 24, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'loans-widget', x: 0, y: 28, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'shopping-lists-widget', x: 0, y: 32, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'recurring-bills-widget', x: 0, y: 36, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'partnership-widget', x: 0, y: 40, w: 6, h: 3, minW: 6, minH: 2, isResizable: false },
        { i: 'analytics-widget', x: 0, y: 43, w: 6, h: 4, minW: 6, minH: 3, isResizable: false },
        { i: 'reminders-widget', x: 0, y: 47, w: 6, h: 3, minW: 6, minH: 2, isResizable: false },
        { i: 'achievements-widget', x: 0, y: 50, w: 6, h: 3, minW: 6, minH: 2, isResizable: false },
        { i: 'currency-calculator-widget', x: 0, y: 53, w: 6, h: 3, minW: 6, minH: 2, isResizable: false },
        { i: 'economic-news-widget', x: 0, y: 56, w: 6, h: 5, minW: 6, minH: 4, isResizable: false },
        { i: 'recent-transactions', x: 0, y: 61, w: 6, h: 5, minW: 6, minH: 4, isResizable: false }
    ]
}

// Widget metadata for display and configuration
export const WIDGET_REGISTRY = {
    // Core Dashboard Widgets
    'summary-cards': {
        id: 'summary-cards',
        title: 'dashboard.summaryCards',
        icon: '💰',
        defaultVisible: true,
        category: 'core'
    },
    'budget-progress': {
        id: 'budget-progress',
        title: 'navigation.budgets',
        icon: '🎯',
        defaultVisible: true,
        category: 'core'
    },
    'savings-goals': {
        id: 'savings-goals',
        title: 'dashboard.savingGoals',
        icon: '💎',
        defaultVisible: true,
        category: 'core'
    },
    'upcoming-bills': {
        id: 'upcoming-bills',
        title: 'recurringBills.upcoming',
        icon: '📅',
        defaultVisible: true,
        category: 'core'
    },
    'quick-access': {
        id: 'quick-access',
        title: 'dashboard.quickAccess',
        icon: '⚡',
        defaultVisible: true,
        category: 'core'
    },
    'recent-transactions': {
        id: 'recent-transactions',
        title: 'dashboard.recentTransactions',
        icon: '📋',
        defaultVisible: true,
        category: 'core'
    },
    // Page Link Widgets - Add all available views
    'expenses-widget': {
        id: 'expenses-widget',
        title: 'navigation.expenses',
        icon: '📉',
        defaultVisible: false,
        category: 'page',
        path: '/expenses'
    },
    'income-widget': {
        id: 'income-widget',
        title: 'navigation.income',
        icon: '📈',
        defaultVisible: false,
        category: 'page',
        path: '/income'
    },
    'analytics-widget': {
        id: 'analytics-widget',
        title: 'navigation.analytics',
        icon: '📊',
        defaultVisible: false,
        category: 'page',
        path: '/analytics'
    },
    'loans-widget': {
        id: 'loans-widget',
        title: 'navigation.loans',
        icon: '🏦',
        defaultVisible: false,
        category: 'page',
        path: '/loans'
    },
    'shopping-lists-widget': {
        id: 'shopping-lists-widget',
        title: 'navigation.shoppingLists',
        icon: '🛒',
        defaultVisible: false,
        category: 'page',
        path: '/shopping-lists'
    },
    'partnership-widget': {
        id: 'partnership-widget',
        title: 'navigation.partnership',
        icon: '👥',
        defaultVisible: false,
        category: 'page',
        path: '/partnership'
    },
    'recurring-bills-widget': {
        id: 'recurring-bills-widget',
        title: 'navigation.recurringBills',
        icon: '🔄',
        defaultVisible: false,
        category: 'page',
        path: '/recurring-bills'
    },
    'reminders-widget': {
        id: 'reminders-widget',
        title: 'navigation.reminders',
        icon: '🔔',
        defaultVisible: false,
        category: 'page',
        path: '/reminders'
    },
    'economic-news-widget': {
        id: 'economic-news-widget',
        title: 'navigation.economicNews',
        icon: '📰',
        defaultVisible: false,
        category: 'page',
        path: '/economic-news'
    },
    'achievements-widget': {
        id: 'achievements-widget',
        title: 'navigation.achievements',
        icon: '🏆',
        defaultVisible: false,
        category: 'page',
        path: '/achievements'
    },
    'currency-calculator-widget': {
        id: 'currency-calculator-widget',
        title: 'navigation.currencyCalculator',
        icon: '💱',
        defaultVisible: false,
        category: 'page',
        path: '/currency-calculator'
    }
}

const STORAGE_KEY = 'paire-dashboard-layout'
const HIDDEN_WIDGETS_KEY = 'paire-dashboard-hidden'

/**
 * Custom hook for managing dashboard layout state
 * Handles persistence to localStorage and provides layout manipulation functions
 */
export function useDashboardLayout() {
    // Load saved layouts from localStorage
    const loadSavedLayouts = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            const parsedLayouts = saved ? JSON.parse(saved) : DEFAULT_LAYOUTS

            // Enforce constraints for sm (mobile) breakpoint
            if (parsedLayouts.sm) {
                parsedLayouts.sm = parsedLayouts.sm.map((item, index) => ({
                    ...item,
                    isResizable: false, // Force no resize
                    w: 6, // STRICTLY Force full width
                    minW: 6,
                    maxW: 6,
                    x: 0, // Force to first column
                    y: index // Re-order sequentially to prevent gaps
                }))
            }

            return parsedLayouts
        } catch (e) {
            console.warn('Failed to load saved layouts:', e)
            return DEFAULT_LAYOUTS
        }
    }

    // Load hidden widgets from localStorage
    const loadHiddenWidgets = () => {
        try {
            const saved = localStorage.getItem(HIDDEN_WIDGETS_KEY)
            return saved ? JSON.parse(saved) : []
        } catch (e) {
            console.warn('Failed to load hidden widgets:', e)
            return []
        }
    }

    const [layouts, setLayouts] = useState(loadSavedLayouts)
    const [hiddenWidgets, setHiddenWidgets] = useState(loadHiddenWidgets)
    const [editMode, setEditMode] = useState(false)
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg')

    // Determine breakpoint based on window width
    useEffect(() => {
        const updateBreakpoint = () => {
            const width = window.innerWidth
            if (width >= 1024) {
                setCurrentBreakpoint('lg')
            } else if (width >= 600) {
                setCurrentBreakpoint('md')
            } else {
                setCurrentBreakpoint('sm')
            }
        }

        updateBreakpoint()
        window.addEventListener('resize', updateBreakpoint)
        return () => window.removeEventListener('resize', updateBreakpoint)
    }, [])

    const isMobile = currentBreakpoint === 'sm'

    // Persist layouts to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
        } catch (e) {
            console.warn('Failed to save layouts:', e)
        }
    }, [layouts])

    // Persist hidden widgets to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(HIDDEN_WIDGETS_KEY, JSON.stringify(hiddenWidgets))
        } catch (e) {
            console.warn('Failed to save hidden widgets:', e)
        }
    }, [hiddenWidgets])

    /**
     * Update layouts when user drags/resizes widgets
     */
    const updateLayouts = useCallback((newLayouts) => {
        setLayouts(newLayouts)
    }, [])

    /**
     * Reset layouts to default configuration
     */
    const resetLayout = useCallback(() => {
        setLayouts(DEFAULT_LAYOUTS)
        setHiddenWidgets([])
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(HIDDEN_WIDGETS_KEY)
    }, [])

    /**
     * Toggle widget visibility
     */
    /**
     * Toggle widget visibility with smart sizing
     */
    const toggleWidget = useCallback((widgetId) => {
        setHiddenWidgets(prev => {
            const isHidden = prev.includes(widgetId)

            if (isHidden) {
                // We are SHOWING the widget.
                // Reset its size to default/optimal for the current view to avoid "tiny widget" issue
                setLayouts(currentLayouts => {
                    const nextLayouts = { ...currentLayouts }

                    // Column counts for each breakpoint
                    const MAX_COLS = { lg: 12, md: 10, sm: 6 }

                    // Iterate through all breakpoints to reset size for this widget
                    Object.keys(nextLayouts).forEach(bp => {
                        let layout = nextLayouts[bp]

                        // Robustness check: Ensure layout is an array. If corrupted/missing, initialize it.
                        if (!Array.isArray(layout)) {
                            layout = []
                            // If it wasn't an array, we must assign the empty array back to nextLayouts
                            // so we can push to it later if needed.
                            nextLayouts[bp] = layout
                        }

                        const widgetIndex = layout.findIndex(item => item.i === widgetId)
                        const defaultItem = DEFAULT_LAYOUTS[bp]?.find(i => i.i === widgetId)

                        // Calculate Y position for new/moved items (append to bottom)
                        // This is a simple heuristic; RGL will compact it.
                        // We find the max Y + H in current layout
                        const maxY = layout.length > 0
                            ? Math.max(...layout.map(i => i.y + i.h))
                            : 0

                        if (widgetIndex !== -1) {
                            // Update existing item
                            if (defaultItem) {
                                const newLayout = [...layout]
                                newLayout[widgetIndex] = {
                                    ...newLayout[widgetIndex],
                                    w: MAX_COLS[bp] || defaultItem.w,
                                    h: defaultItem.h,
                                    isResizable: undefined
                                }
                                nextLayouts[bp] = newLayout
                            }
                        } else {
                            // Item doesn't exist in this breakpoint's layout (e.g. new widget not in saved state)
                            // We must ADD it.
                            if (defaultItem) {
                                const newItem = {
                                    ...defaultItem,
                                    x: 0,
                                    y: maxY, // Put at bottom
                                    w: MAX_COLS[bp] || defaultItem.w, // FORCE FULL WIDTH
                                    isResizable: undefined
                                }
                                nextLayouts[bp] = [...layout, newItem]
                            }
                        }
                    })
                    return nextLayouts
                })

                return prev.filter(id => id !== widgetId)
            } else {
                return [...prev, widgetId]
            }
        })
    }, [])

    /**
     * Show a specific widget
     */
    const showWidget = useCallback((widgetId) => {
        setHiddenWidgets(prev => prev.filter(id => id !== widgetId))
    }, [])

    /**
     * Hide a specific widget
     */
    const hideWidget = useCallback((widgetId) => {
        setHiddenWidgets(prev => {
            if (!prev.includes(widgetId)) {
                return [...prev, widgetId]
            }
            return prev
        })
    }, [])

    /**
     * Check if a widget is visible
     */
    const isWidgetVisible = useCallback((widgetId) => {
        return !hiddenWidgets.includes(widgetId)
    }, [hiddenWidgets])

    /**
     * Get visible layouts with strict enforcement for mobile and edit mode validation
     */
    const getVisibleLayouts = useCallback(() => {
        const filtered = {}

        // Handle desktop/tablet layouts normally (from state)
        Object.keys(layouts).forEach(breakpoint => {
            if (breakpoint !== 'sm') {
                const currentLayout = layouts[breakpoint]
                if (Array.isArray(currentLayout)) {
                    filtered[breakpoint] = currentLayout
                        .filter(item => !hiddenWidgets.includes(item.i))
                        .map(item => ({
                            ...item,
                            static: !editMode // Lock items (no drag/resize) when not in edit mode
                        }))
                } else {
                    filtered[breakpoint] = []
                }
            }
        })

        // STRICTLY enforce mobile layout:
        // Ignore saved dimensions/positions for 'sm' and return a computed single column
        if (layouts.sm && Array.isArray(layouts.sm)) {
            const activeWidgets = layouts.sm.filter(item => !hiddenWidgets.includes(item.i))

            // Sort by Y to maintain order, but force X=0, W=6 (full width for 6-col grid)
            // Use existing IDs from the registry to ensure we catch everything properly if needed,
            // but primarily trust the layout order for sequence.
            filtered.sm = activeWidgets
                .sort((a, b) => a.y - b.y)
                .map((item, index) => ({
                    ...item,
                    x: 0,
                    y: index, // Simple sequential ordering, RGL will compact based on height
                    w: 6, // Force full width (assuming 6 col grid)
                    minW: 6,
                    maxW: 6,
                    isResizable: false, // Disable resize strictly
                    static: !editMode // Lock items (no drag/resize) when not in edit mode
                }))
        } else {
            // Fallback if sm layout missing (shouldn't happen with default)
            filtered.sm = DEFAULT_LAYOUTS.sm
                .filter(item => !hiddenWidgets.includes(item.i))
                .map((item, index) => ({
                    ...item,
                    x: 0,
                    y: index,
                    w: 6,
                    minW: 6,
                    maxW: 6,
                    isResizable: false,
                    static: !editMode
                }))
        }

        return filtered
    }, [layouts, hiddenWidgets])

    return {
        layouts,
        visibleLayouts: getVisibleLayouts(),
        currentBreakpoint,
        isMobile,
        hiddenWidgets,
        editMode,
        setEditMode,
        updateLayouts,
        resetLayout,
        toggleWidget,
        showWidget,
        hideWidget,
        isWidgetVisible,
        widgetRegistry: WIDGET_REGISTRY
    }
}

export default useDashboardLayout
