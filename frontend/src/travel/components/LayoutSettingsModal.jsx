import { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { IoClose, IoSettingsSharp, IoReorderThree } from 'react-icons/io5'
import { FiEye, FiEyeOff, FiRotateCcw } from 'react-icons/fi'
import './LayoutSettingsModal.css'

/**
 * Modal for customizing TravelHome layout
 * Features: preset selection, drag-and-drop reordering, toggle visibility
 * Uses framer-motion Reorder for smooth drag interactions
 */
export default function LayoutSettingsModal({
    isOpen,
    onClose,
    sections,
    preset,
    presets,
    isSaving,
    hasChanges,
    onApplyPreset,
    onToggleSection,
    onUpdateColumnOrder,
    onReset,
    onSave
}) {
    const { t } = useTranslation()
    const [activeColumn, setActiveColumn] = useState('mainColumn')

    if (!isOpen) return null

    const handleSaveAndClose = async () => {
        try {
            await onSave()
            onClose()
        } catch (error) {
            console.error('Failed to save layout:', error)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="layout-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="layout-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="layout-modal-header">
                            <div className="layout-modal-title">
                                <IoSettingsSharp className="title-icon" />
                                <h2>{t('travel.layout.title')}</h2>
                            </div>
                            <button className="close-btn" onClick={onClose} aria-label={t('common.close')}>
                                <IoClose />
                            </button>
                        </div>

                        <div className="layout-modal-content">
                            {/* Presets Section */}
                            <div className="presets-section">
                                <h3>{t('travel.layout.presets.title')}</h3>
                                <div className="presets-row">
                                    {Object.entries(presets).map(([key, presetData]) => (
                                        <button
                                            key={key}
                                            className={`preset-btn ${preset === key ? 'active' : ''}`}
                                            onClick={() => onApplyPreset(key)}
                                        >
                                            <span className="preset-icon">{presetData.icon}</span>
                                            <span className="preset-name">{t(`travel.layout.presets.${key}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Column Tabs */}
                            <div className="column-tabs">
                                <button
                                    className={`tab-btn ${activeColumn === 'mainColumn' ? 'active' : ''}`}
                                    onClick={() => setActiveColumn('mainColumn')}
                                >
                                    {t('travel.layout.columns.main')}
                                </button>
                                <button
                                    className={`tab-btn ${activeColumn === 'sidebarColumn' ? 'active' : ''}`}
                                    onClick={() => setActiveColumn('sidebarColumn')}
                                >
                                    {t('travel.layout.columns.sidebar')}
                                </button>
                            </div>

                            {/* Sections List - Reorder.Group */}
                            <div className="sections-list-container">
                                <p className="sections-hint">{t('travel.layout.hint')}</p>

                                <Reorder.Group
                                    axis="y"
                                    values={sections[activeColumn] || []}
                                    onReorder={(newOrder) => onUpdateColumnOrder(activeColumn, newOrder)}
                                    className="sections-list"
                                    as="div"
                                >
                                    {sections[activeColumn]?.map((section) => (
                                        <Reorder.Item
                                            key={section.key}
                                            value={section}
                                            as="div"
                                            className={`section-item ${!section.visible ? 'hidden' : ''}`}
                                            whileDrag={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.3)", zIndex: 10 }}
                                        >
                                            <div className="section-drag-handle">
                                                <IoReorderThree />
                                            </div>
                                            <span className="section-label">{t(`travel.layout.sections.${section.key}`)}</span>
                                            <button
                                                className="visibility-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation() // Prevent drag start when clicking button
                                                    onToggleSection(activeColumn, section.key)
                                                }}
                                                onPointerDown={(e) => e.stopPropagation()} // Vital for Reorder to ignore this area
                                                aria-label={section.visible ? 'Hide section' : 'Show section'}
                                            >
                                                {section.visible ? <FiEye /> : <FiEyeOff />}
                                            </button>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            </div>
                        </div>

                        <div className="layout-modal-footer">
                            <button className="reset-btn" onClick={onReset}>
                                <FiRotateCcw />
                                {t('travel.layout.reset')}
                            </button>
                            <div className="footer-actions">
                                <button className="cancel-btn" onClick={onClose}>
                                    {t('travel.layout.cancel')}
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={handleSaveAndClose}
                                    disabled={!hasChanges || isSaving}
                                >
                                    {isSaving ? t('travel.layout.saving') : t('travel.layout.save')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

