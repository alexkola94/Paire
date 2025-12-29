import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiPlus, FiCheck, FiX } from 'react-icons/fi'
import Modal from './Modal'
import './WidgetSelector.css'

/**
 * Widget Selector Component
 * Modal/sidebar for adding/removing widgets from the dashboard
 */
const WidgetSelector = memo(function WidgetSelector({
    isOpen,
    onClose,
    widgetRegistry,
    hiddenWidgets,
    onToggleWidget
}) {
    const { t } = useTranslation()

    if (!isOpen) return null

    const widgets = Object.values(widgetRegistry)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dashboard.manageWidgets') || 'Manage Widgets'}
        >
            <div className="widget-selector">
                <p className="widget-selector-description">
                    {t('dashboard.manageWidgetsDescription') || 'Toggle which widgets appear on your dashboard.'}
                </p>

                <div className="widget-list">
                    {widgets.map(widget => {
                        const isVisible = !hiddenWidgets.includes(widget.id)

                        return (
                            <div
                                key={widget.id}
                                className={`widget-list-item ${isVisible ? 'visible' : 'hidden'}`}
                                onClick={() => onToggleWidget(widget.id)}
                            >
                                <div className="widget-item-info">
                                    <span className="widget-item-icon">{widget.icon}</span>
                                    <span className="widget-item-title">
                                        {t(widget.title) || widget.title}
                                    </span>
                                </div>

                                <div className={`widget-toggle ${isVisible ? 'on' : 'off'}`}>
                                    {isVisible ? (
                                        <FiCheck size={16} />
                                    ) : (
                                        <FiPlus size={16} />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="widget-selector-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        {t('common.done') || 'Done'}
                    </button>
                </div>
            </div>
        </Modal>
    )
})

export default WidgetSelector
