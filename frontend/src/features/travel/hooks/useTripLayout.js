import { useState, useEffect, useCallback } from 'react'
import { layoutPreferencesService } from '../services/travelApi'

/**
 * Default section configuration for TravelHome page
 * Order determines display order, visible toggles show/hide
 */
const DEFAULT_SECTIONS = {
    mainColumn: [
        { key: 'countdown', label: 'Countdown', visible: true },
        { key: 'destinationSnapshot', label: 'Destination Info', visible: true },
        { key: 'todayStrip', label: 'Quick Stats', visible: true },
        { key: 'tripMicrography', label: 'Trip Micrography', visible: true },
        { key: 'encouragement', label: 'Motivation', visible: true }
    ],
    sidebarColumn: [
        { key: 'advisory', label: 'Travel Advisory', visible: true },
        { key: 'routeSummary', label: 'Route Summary', visible: true },
        { key: 'cityTimeline', label: 'City Timeline', visible: true },
        { key: 'savedPlaces', label: 'Saved Places', visible: true },
        { key: 'statusSummary', label: 'Status Details', visible: true }
    ]
}

/**
 * Preset configurations for quick layout selection
 */
const PRESETS = {
    planning: {
        name: 'Planning Mode',
        icon: '📋',
        mainColumn: [
            { key: 'countdown', visible: true },
            { key: 'destinationSnapshot', visible: true },
            { key: 'todayStrip', visible: true },
            { key: 'tripMicrography', visible: true },
            { key: 'encouragement', visible: true }
        ],
        sidebarColumn: [
            { key: 'advisory', visible: true },
            { key: 'routeSummary', visible: true },
            { key: 'cityTimeline', visible: true },
            { key: 'savedPlaces', visible: true },
            { key: 'statusSummary', visible: true }
        ]
    },
    active: {
        name: 'On Trip',
        icon: '✈️',
        mainColumn: [
            { key: 'countdown', visible: true },
            { key: 'todayStrip', visible: true },
            { key: 'tripMicrography', visible: true },
            { key: 'destinationSnapshot', visible: false },
            { key: 'encouragement', visible: false }
        ],
        sidebarColumn: [
            { key: 'advisory', visible: true },
            { key: 'cityTimeline', visible: true },
            { key: 'savedPlaces', visible: true },
            { key: 'routeSummary', visible: false },
            { key: 'statusSummary', visible: false }
        ]
    },
    minimal: {
        name: 'Minimal',
        icon: '🎯',
        mainColumn: [
            { key: 'countdown', visible: true },
            { key: 'todayStrip', visible: true },
            { key: 'destinationSnapshot', visible: false },
            { key: 'tripMicrography', visible: false },
            { key: 'encouragement', visible: false }
        ],
        sidebarColumn: [
            { key: 'advisory', visible: true },
            { key: 'routeSummary', visible: false },
            { key: 'cityTimeline', visible: false },
            { key: 'savedPlaces', visible: false },
            { key: 'statusSummary', visible: false }
        ]
    },
    custom: {
        name: 'Custom',
        icon: '⚙️',
        mainColumn: [],
        sidebarColumn: []
    }
}

/**
 * Custom hook for managing TravelHome layout preferences
 * Handles loading, saving, presets, and section reordering
 */
export function useTripLayout(tripId) {
    const [sections, setSections] = useState(DEFAULT_SECTIONS)
    const [preset, setPreset] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Load preferences on mount or trip change
    useEffect(() => {
        if (!tripId) {
            setIsLoading(false)
            return
        }

        const loadPreferences = async () => {
            setIsLoading(true)
            try {
                const result = await layoutPreferencesService.getByTrip(tripId)
                const parsed = layoutPreferencesService.parseConfig(result.layoutConfig)

                if (parsed) {
                    // Merge with defaults to ensure all sections exist
                    const merged = mergeWithDefaults(parsed)
                    setSections(merged)
                    setPreset(result.preset || null)
                } else {
                    setSections(DEFAULT_SECTIONS)
                    setPreset(null)
                }
            } catch (error) {
                console.error('Error loading layout preferences:', error)
                setSections(DEFAULT_SECTIONS)
            } finally {
                setIsLoading(false)
            }
        }

        loadPreferences()
    }, [tripId])

    // Merge saved config with defaults to handle new sections
    const mergeWithDefaults = useCallback((saved) => {
        const merged = { mainColumn: [], sidebarColumn: [] }

        for (const column of ['mainColumn', 'sidebarColumn']) {
            const defaultKeys = DEFAULT_SECTIONS[column].map(s => s.key)
            const savedMap = new Map(saved[column]?.map(s => [s.key, s]) || [])

            // Add saved sections in their saved order
            for (const savedSection of saved[column] || []) {
                if (defaultKeys.includes(savedSection.key)) {
                    const defaultSection = DEFAULT_SECTIONS[column].find(s => s.key === savedSection.key)
                    merged[column].push({
                        ...defaultSection,
                        visible: savedSection.visible
                    })
                }
            }

            // Add any new default sections that weren't in saved config
            for (const defaultSection of DEFAULT_SECTIONS[column]) {
                if (!savedMap.has(defaultSection.key)) {
                    merged[column].push(defaultSection)
                }
            }
        }

        return merged
    }, [])

    // Save preferences to backend
    const saveLayout = useCallback(async () => {
        if (!tripId) return

        setIsSaving(true)
        try {
            await layoutPreferencesService.update(tripId, sections, preset)
            setHasChanges(false)
        } catch (error) {
            console.error('Error saving layout preferences:', error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }, [tripId, sections, preset])

    // Apply a preset
    const applyPreset = useCallback((presetKey) => {
        if (presetKey === 'custom') {
            setPreset('custom')
            return
        }

        const presetConfig = PRESETS[presetKey]
        if (!presetConfig) return

        const newSections = {
            mainColumn: presetConfig.mainColumn.map(p => {
                const defaultSection = DEFAULT_SECTIONS.mainColumn.find(s => s.key === p.key)
                return { ...defaultSection, visible: p.visible }
            }),
            sidebarColumn: presetConfig.sidebarColumn.map(p => {
                const defaultSection = DEFAULT_SECTIONS.sidebarColumn.find(s => s.key === p.key)
                return { ...defaultSection, visible: p.visible }
            })
        }

        setSections(newSections)
        setPreset(presetKey)
        setHasChanges(true)
    }, [])

    // Toggle section visibility
    const toggleSection = useCallback((column, sectionKey) => {
        setSections(prev => ({
            ...prev,
            [column]: prev[column].map(s =>
                s.key === sectionKey ? { ...s, visible: !s.visible } : s
            )
        }))
        setPreset('custom')
        setHasChanges(true)
    }, [])

    // Reorder sections via drag-and-drop
    const reorderSections = useCallback((column, fromIndex, toIndex) => {
        setSections(prev => {
            const newColumn = [...prev[column]]
            const [removed] = newColumn.splice(fromIndex, 1)
            newColumn.splice(toIndex, 0, removed)
            return { ...prev, [column]: newColumn }
        })
        setPreset('custom')
        setHasChanges(true)
    }, [])

    // Update entire column order (for framer-motion Reorder)
    const updateColumnOrder = useCallback((column, newOrderedSections) => {
        setSections(prev => ({
            ...prev,
            [column]: newOrderedSections
        }))
        setPreset('custom')
        setHasChanges(true)
    }, [])

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        setSections(DEFAULT_SECTIONS)
        setPreset(null)
        setHasChanges(true)
    }, [])

    // Check if a section is visible
    const isSectionVisible = useCallback((sectionKey) => {
        for (const column of ['mainColumn', 'sidebarColumn']) {
            const section = sections[column].find(s => s.key === sectionKey)
            if (section) return section.visible
        }
        return true // Default to visible if not found
    }, [sections])

    // Get visible sections for a column in order
    const getVisibleSections = useCallback((column) => {
        return sections[column]?.filter(s => s.visible) || []
    }, [sections])

    return {
        sections,
        preset,
        presets: PRESETS,
        isLoading,
        isSaving,
        hasChanges,
        saveLayout,
        applyPreset,
        toggleSection,
        reorderSections,
        updateColumnOrder,
        resetToDefaults,
        isSectionVisible,
        getVisibleSections
    }
}

export { DEFAULT_SECTIONS, PRESETS }
