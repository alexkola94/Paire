import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for auto-saving form drafts
 * Automatically saves form data to localStorage and restores on form reopen
 */
function useFormDraft(formName, formData, options = {}) {
  const {
    autoSaveInterval = 5000, // 5 seconds
    enabled = true,
    onDraftRestored = null,
    onDraftSaved = null
  } = options

  const [hasDraft, setHasDraft] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const autoSaveTimerRef = useRef(null)
  const lastSavedDataRef = useRef(null)

  /**
   * Get draft key for localStorage
   */
  const getDraftKey = useCallback(() => {
    return `form_draft_${formName}`
  }, [formName])

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback((data) => {
    if (!enabled) return

    try {
      const draftData = {
        data,
        timestamp: Date.now(),
        formName
      }
      localStorage.setItem(getDraftKey(), JSON.stringify(draftData))
      setHasDraft(true)
      lastSavedDataRef.current = JSON.stringify(data)

      if (onDraftSaved) {
        onDraftSaved(draftData)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      // localStorage might be full or disabled
    }
  }, [enabled, getDraftKey, formName, onDraftSaved])

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback(() => {
    if (!enabled) return null

    try {
      const draftJson = localStorage.getItem(getDraftKey())
      if (!draftJson) {
        setHasDraft(false)
        return null
      }

      const draftData = JSON.parse(draftJson)
      setHasDraft(true)
      return draftData.data
    } catch (error) {
      console.error('Error loading draft:', error)
      setHasDraft(false)
      return null
    }
  }, [enabled, getDraftKey])

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getDraftKey())
      setHasDraft(false)
      lastSavedDataRef.current = null

      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }, [getDraftKey])

  /**
   * Restore draft
   */
  const restoreDraft = useCallback(() => {
    if (!enabled) return null

    setIsRestoring(true)
    const draftData = loadDraft()

    if (draftData && onDraftRestored) {
      onDraftRestored(draftData)
    }

    setIsRestoring(false)
    return draftData
  }, [enabled, loadDraft, onDraftRestored])

  /**
   * Check if draft exists
   */
  const checkDraft = useCallback(() => {
    if (!enabled) return false

    try {
      const draftJson = localStorage.getItem(getDraftKey())
      if (!draftJson) {
        setHasDraft(false)
        return false
      }

      const draftData = JSON.parse(draftJson)
      // Check if draft is not too old (optional: 7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      const isExpired = Date.now() - draftData.timestamp > maxAge

      if (isExpired) {
        clearDraft()
        return false
      }

      setHasDraft(true)
      return true
    } catch (error) {
      console.error('Error checking draft:', error)
      setHasDraft(false)
      return false
    }
  }, [enabled, getDraftKey, clearDraft])

  /**
   * Auto-save form data
   */
  useEffect(() => {
    if (!enabled || !formData) return

    // Check if data has changed
    const currentDataString = JSON.stringify(formData)
    if (currentDataString === lastSavedDataRef.current) {
      return // No changes, skip save
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    // Set up auto-save interval
    autoSaveTimerRef.current = setInterval(() => {
      saveDraft(formData)
    }, autoSaveInterval)

    // Save immediately on first change
    saveDraft(formData)

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [formData, enabled, autoSaveInterval, saveDraft])

  // Check for existing draft on mount
  useEffect(() => {
    if (enabled) {
      checkDraft()
    }
  }, [enabled, checkDraft])

  return {
    hasDraft,
    isRestoring,
    saveDraft: () => saveDraft(formData),
    loadDraft,
    restoreDraft,
    clearDraft,
    checkDraft
  }
}

export default useFormDraft

