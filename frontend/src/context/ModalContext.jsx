import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const ModalContext = createContext()

/**
 * ModalProvider
 * Tracks when modals are open to hide bottom navigation on mobile
 */
export const ModalProvider = ({ children }) => {
  const [openModals, setOpenModals] = useState(new Set())

  const registerModal = useCallback((modalId) => {
    setOpenModals(prev => new Set([...prev, modalId]))
  }, [])

  const unregisterModal = useCallback((modalId) => {
    setOpenModals(prev => {
      const next = new Set(prev)
      next.delete(modalId)
      return next
    })
  }, [])

  const hasOpenModals = openModals.size > 0

  return (
    <ModalContext.Provider value={{ hasOpenModals, registerModal, unregisterModal }}>
      {children}
    </ModalContext.Provider>
  )
}

/**
 * Hook to use modal context
 */
export const useModal = () => {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider') // i18n-ignore
  }
  return context
}

/**
 * Hook to automatically register/unregister a modal
 * Use this in modal components to automatically hide bottom nav
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {string} modalId - Unique identifier for the modal (optional, auto-generated if not provided)
 */
export const useModalRegistration = (isOpen, modalId = null) => {
  const { registerModal, unregisterModal } = useModal()
  const idRef = useRef(modalId || `modal-${Date.now()}-${Math.random()}`)

  useEffect(() => {
    if (isOpen) {
      registerModal(idRef.current)
    } else {
      unregisterModal(idRef.current)
    }

    return () => {
      unregisterModal(idRef.current)
    }
  }, [isOpen, registerModal, unregisterModal])
}

export default ModalContext
