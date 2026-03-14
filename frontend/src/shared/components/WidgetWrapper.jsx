import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMove, FiX, FiMaximize2 } from 'react-icons/fi'
import './WidgetWrapper.css'

/**
 * Widget Wrapper Component
 * Provides consistent styling and edit mode controls for dashboard widgets
 */
const WidgetWrapper = memo(function WidgetWrapper({
    id,
    title,
    icon,
    children,
    editMode = false,
    onRemove,
    className = ''
}) {
    const { t } = useTranslation()

    return (
        <div className={`widget-wrapper glass-card ${editMode ? 'edit-mode' : ''} ${className}`}>
            {/* Widget Header with drag handle */}
            <div className="widget-header">
                <div className="widget-title">
                    {icon && <span className="widget-icon">{icon}</span>}
                    <h3>{t(title) || title}</h3>
                </div>

                {/* Edit mode controls */}
                {editMode && (
                    <div className="widget-controls">
                        <button
                            className="widget-control-btn drag-handle"
                            title={t('dashboard.dragWidget')}
                        >
                            <FiMove size={16} />
                        </button>
                        <button
                            className="widget-control-btn remove-btn"
                            onClick={() => onRemove && onRemove(id)}
                            title={t('dashboard.hideWidget')}
                        >
                            <FiX size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Widget Content */}
            <div className="widget-content">
                {children}
            </div>

            {/* Resize indicator (shown in edit mode) */}
            {editMode && (
                <div className="widget-resize-indicator">
                    <FiMaximize2 size={12} />
                </div>
            )}
        </div>
    )
})

export default WidgetWrapper
