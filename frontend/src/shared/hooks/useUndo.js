import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for undo functionality
 * Allows users to undo actions after they've been performed
 */
function useUndo() {
  const [undoStack, setUndoStack] = useState([])
  const timeoutRef = useRef(null)

  /**
   * Perform an action with undo capability
   */
  const performAction = useCallback((action, undoAction, timeout = 5000) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Save undo action to stack
    setUndoStack(prev => [...prev, { undoAction, timestamp: Date.now() }])
    
    // Perform the action (can be async)
    const result = action()
    
    // Set timeout to clear undo after specified time
    timeoutRef.current = setTimeout(() => {
      setUndoStack(prev => {
        // Remove the oldest undo if it matches this timestamp
        const filtered = prev.filter(item => item.timestamp !== prev[prev.length - 1]?.timestamp)
        return filtered
      })
    }, timeout)
    
    return result
  }, [])

  /**
   * Undo the last action
   */
  const undo = useCallback(async () => {
    if (undoStack.length === 0) return false
    
    const lastAction = undoStack[undoStack.length - 1]
    
    if (lastAction.undoAction) {
      // Execute undo action (can be async)
      await lastAction.undoAction()
      
      // Remove from stack
      setUndoStack(prev => prev.slice(0, -1))
      
      // Clear timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      return true
    }
    
    return false
  }, [undoStack])

  /**
   * Check if undo is available
   */
  const canUndo = undoStack.length > 0

  /**
   * Clear undo stack
   */
  const clearUndo = useCallback(() => {
    setUndoStack([])
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {
    performAction,
    undo,
    canUndo,
    clearUndo,
    undoCount: undoStack.length
  }
}

export default useUndo

