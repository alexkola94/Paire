import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX } from 'react-icons/fi';
import './Modal.css';

/**
 * Reusable Modal Component using React Portal
 * Renders at document.body level to avoid stacking context issues
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    showCloseButton = true
}) => {
    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="portal-modal-overlay">
            <div
                className={`portal-modal-content ${className}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {(title || showCloseButton) && (
                    <div className="portal-modal-header">
                        {title && <h2 id="modal-title">{title}</h2>}
                        {showCloseButton && (
                            <button
                                className="portal-modal-close-btn"
                                onClick={onClose}
                                aria-label="Close"
                                type="button"
                            >
                                <FiX size={24} />
                            </button>
                        )}
                    </div>
                )}
                <div className="portal-modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
