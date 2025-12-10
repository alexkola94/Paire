import React from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiType, FiActivity, FiEye } from 'react-icons/fi'
import { useAccessibility } from '../context/AccessibilityContext'
import './AccessibilitySettings.css'

const AccessibilitySettings = ({ isOpen, onClose }) => {
    const { t } = useTranslation()
    const { settings, updateSettings, resetSettings } = useAccessibility()

    if (!isOpen) return null

    return (
        <div className="accessibility-modal-overlay" onClick={onClose}>
            <div
                className="accessibility-modal card glass-card"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="a11y-title"
            >
                <div className="accessibility-header">
                    <h2 id="a11y-title">{t('common.accessibility') || 'Accessibility'}</h2>
                    <button className="icon-btn close-btn" onClick={onClose} aria-label={t('common.close')}>
                        <FiX size={24} />
                    </button>
                </div>

                <div className="accessibility-content">
                    {/* Font Size Section */}
                    <div className="setting-group">
                        <div className="setting-label">
                            <FiType className="setting-icon" />
                            <div>
                                <h3>{t('settings.fontSize') || 'Font Size'}</h3>
                                <p>{t('settings.fontSizeDesc') || 'Adjust text size for better readability'}</p>
                            </div>
                        </div>
                        <div className="segmented-control">
                            <button
                                className={`segment-btn ${settings.fontSize === 'normal' ? 'active' : ''}`}
                                onClick={() => updateSettings({ fontSize: 'normal' })}
                            >
                                A
                            </button>
                            <button
                                className={`segment-btn ${settings.fontSize === 'large' ? 'active' : ''}`}
                                onClick={() => updateSettings({ fontSize: 'large' })}
                                style={{ fontSize: '1.2em' }}
                            >
                                A
                            </button>
                            <button
                                className={`segment-btn ${settings.fontSize === 'xl' ? 'active' : ''}`}
                                onClick={() => updateSettings({ fontSize: 'xl' })}
                                style={{ fontSize: '1.5em' }}
                            >
                                A
                            </button>
                        </div>
                    </div>

                    {/* Reduced Motion Section */}
                    <div className="setting-group">
                        <div className="setting-label">
                            <FiActivity className="setting-icon" />
                            <div>
                                <h3>{t('settings.reducedMotion') || 'Reduced Motion'}</h3>
                                <p>{t('settings.reducedMotionDesc') || 'Minimize animations and transitions'}</p>
                            </div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.reducedMotion}
                                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    {/* High Contrast Section */}
                    <div className="setting-group">
                        <div className="setting-label">
                            <FiEye className="setting-icon" />
                            <div>
                                <h3>{t('settings.highContrast') || 'High Contrast'}</h3>
                                <p>{t('settings.highContrastDesc') || 'Increase contrast for borders and text'}</p>
                            </div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.highContrast}
                                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="accessibility-footer">
                    <button className="btn btn-outline" onClick={resetSettings}>
                        {t('common.reset') || 'Reset Defaults'}
                    </button>
                    <button className="btn btn-primary" onClick={onClose}>
                        {t('common.done') || 'Done'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AccessibilitySettings
