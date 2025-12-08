import { createPortal } from 'react-dom'
import Toast from './Toast'
import './ToastContainer.css'

/**
 * Toast Container Component
 * Manages and displays multiple toast notifications
 */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null

  return createPortal(
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>,
    document.body
  )
}

export default ToastContainer

