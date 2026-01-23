import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FiBell, FiMail, FiSmartphone, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import { useNotifications } from '../context/NotificationContext'
import './TravelNotificationSettings.css'

/**
 * Travel Notification Settings Page
 * Allows users to configure travel-specific notification preferences
 */
function TravelNotificationSettings({ trip, onNavigate }) {
  const { t } = useTranslation()
  const {
    preferences,
    preferencesLoading,
    loadPreferences,
    updatePreferences,
    pushSupported,
    pushPermission,
    enablePushNotifications,
    checkNotifications
  } = useNotifications()

  const [localSettings, setLocalSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [hasChanges, setHasChanges] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences(trip?.id)
  }, [loadPreferences, trip?.id])

  // Sync local settings with loaded preferences
  useEffect(() => {
    if (preferences) {
      setLocalSettings(preferences)
      setHasChanges(false)
    }
  }, [preferences])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const handleChange = useCallback((field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }, [])

  const handleDaysChange = useCallback((field, day, checked) => {
    setLocalSettings(prev => {
      const currentDays = prev[field] || []
      const newDays = checked
        ? [...currentDays, day].sort((a, b) => b - a)
        : currentDays.filter(d => d !== day)
      return { ...prev, [field]: newDays }
    })
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      await updatePreferences({
        ...localSettings,
        tripId: trip?.id
      })
      setHasChanges(false)
      showMessage('success', t('travel.notifications.settingsSaved', 'Settings saved successfully'))
    } catch (error) {
      console.error('Error saving settings:', error)
      showMessage('error', t('travel.notifications.errorSaving', 'Failed to save settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotifications = async () => {
    if (!trip?.id) {
      showMessage('error', t('travel.notifications.noTripSelected', 'No trip selected'))
      return
    }

    try {
      setTesting(true)
      const result = await checkNotifications(trip.id)
      if (result?.notificationsSent > 0) {
        showMessage('success', t('travel.notifications.notificationsSent', { count: result.notificationsSent }))
      } else {
        showMessage('info', t('travel.notifications.noNotificationsToSend', 'No notifications to send at this time'))
      }
    } catch (error) {
      console.error('Error testing notifications:', error)
      showMessage('error', t('travel.notifications.errorTesting', 'Failed to check notifications'))
    } finally {
      setTesting(false)
    }
  }

  const handleEnablePush = async () => {
    await enablePushNotifications()
  }

  if (preferencesLoading && !localSettings) {
    return (
      <div className="travel-notification-settings loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!localSettings) return null

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  }

  return (
    <motion.div
      className="travel-notification-settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="settings-header" variants={itemVariants} initial="hidden" animate="visible">
        <h1>
          <FiBell /> {t('travel.notifications.title', 'Notification Settings')}
        </h1>
        <p className="subtitle">
          {t('travel.notifications.subtitle', 'Configure how you receive travel alerts and reminders')}
        </p>
      </motion.div>

      {message.text && (
        <motion.div
          className={`message message-${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.type === 'success' && <FiCheck />}
          {message.type === 'error' && <FiAlertTriangle />}
          {message.text}
        </motion.div>
      )}

      <motion.div className="settings-content" variants={containerVariants} initial="hidden" animate="visible">

        {/* Delivery Channels */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>
              <FiSmartphone /> {t('travel.notifications.deliveryChannels', 'Delivery Channels')}
            </h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.emailEnabled}
                onChange={(e) => handleChange('emailEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                <FiMail /> {t('travel.notifications.emailNotifications', 'Email Notifications')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.emailDescription', 'Receive notifications via email')}
            </p>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.pushEnabled}
                onChange={(e) => handleChange('pushEnabled', e.target.checked)}
                disabled={!pushSupported}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                <FiBell /> {t('travel.notifications.pushNotifications', 'Push Notifications')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.pushDescription', 'Receive browser push notifications')}
            </p>
            {pushSupported && pushPermission !== 'granted' && localSettings.pushEnabled && (
              <button className="btn-secondary btn-small" onClick={handleEnablePush}>
                {t('travel.notifications.enablePush', 'Enable Push')}
              </button>
            )}
            {!pushSupported && (
              <p className="setting-warning">
                {t('travel.notifications.pushNotSupported', 'Push notifications are not supported in this browser')}
              </p>
            )}
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.inAppEnabled}
                onChange={(e) => handleChange('inAppEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.inAppNotifications', 'In-App Notifications')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.inAppDescription', 'Show notifications within the app')}
            </p>
          </div>
        </motion.div>

        {/* Document Alerts */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>📄 {t('travel.notifications.documentAlerts', 'Document Alerts')}</h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.documentExpiryEnabled}
                onChange={(e) => handleChange('documentExpiryEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.documentExpiry', 'Document Expiry Warnings')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.documentExpiryDescription', 'Get alerts when documents are about to expire')}
            </p>
          </div>

          {localSettings.documentExpiryEnabled && (
            <div className="setting-item sub-setting">
              <label>{t('travel.notifications.alertDaysBefore', 'Alert me before expiry:')}</label>
              <div className="checkbox-group">
                {[30, 14, 7, 1].map(days => (
                  <label key={days} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={localSettings.documentExpiryDays?.includes(days)}
                      onChange={(e) => handleDaysChange('documentExpiryDays', days, e.target.checked)}
                    />
                    <span>{days} {days === 1 ? 'day' : 'days'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Budget Alerts */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>💰 {t('travel.notifications.budgetAlerts', 'Budget Alerts')}</h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.budgetAlertsEnabled}
                onChange={(e) => handleChange('budgetAlertsEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.budgetAlertsToggle', 'Budget Threshold Alerts')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.budgetAlertsDescription', 'Get alerts when approaching budget limits')}
            </p>
          </div>

          {localSettings.budgetAlertsEnabled && (
            <>
              <div className="setting-item sub-setting">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={localSettings.budgetThreshold75Enabled}
                    onChange={(e) => handleChange('budgetThreshold75Enabled', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-text">
                    {t('travel.notifications.at75Percent', 'Alert at 75% spent')}
                  </span>
                </label>
              </div>

              <div className="setting-item sub-setting">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={localSettings.budgetThreshold90Enabled}
                    onChange={(e) => handleChange('budgetThreshold90Enabled', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-text">
                    {t('travel.notifications.at90Percent', 'Alert at 90% spent')}
                  </span>
                </label>
              </div>

              <div className="setting-item sub-setting">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={localSettings.budgetExceededEnabled}
                    onChange={(e) => handleChange('budgetExceededEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-text">
                    {t('travel.notifications.whenExceeded', 'Alert when budget exceeded')}
                  </span>
                </label>
              </div>
            </>
          )}
        </motion.div>

        {/* Itinerary Reminders */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>📅 {t('travel.notifications.itineraryReminders', 'Itinerary Reminders')}</h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.itineraryRemindersEnabled}
                onChange={(e) => handleChange('itineraryRemindersEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.eventReminders', 'Event Reminders')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.eventRemindersDescription', 'Get reminded before flights, hotels, and activities')}
            </p>
          </div>

          {localSettings.itineraryRemindersEnabled && (
            <div className="setting-item sub-setting">
              <label>{t('travel.notifications.remindMeBefore', 'Remind me before events:')}</label>
              <div className="checkbox-group">
                {[24, 6, 1].map(hours => (
                  <label key={hours} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={localSettings.itineraryReminderHours?.includes(hours)}
                      onChange={(e) => handleDaysChange('itineraryReminderHours', hours, e.target.checked)}
                    />
                    <span>{hours} {hours === 1 ? 'hour' : 'hours'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Packing Progress */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>🧳 {t('travel.notifications.packingProgress', 'Packing Progress')}</h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.packingProgressEnabled}
                onChange={(e) => handleChange('packingProgressEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.packingMilestones', 'Packing Milestones')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.packingMilestonesDescription', 'Get notified at 50%, 75%, and 100% packing completion')}
            </p>
          </div>
        </motion.div>

        {/* Trip Approaching */}
        <motion.div className="settings-section" variants={itemVariants}>
          <div className="section-header">
            <h2>🗺️ {t('travel.notifications.tripReminders', 'Trip Reminders')}</h2>
          </div>

          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={localSettings.tripApproachingEnabled}
                onChange={(e) => handleChange('tripApproachingEnabled', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span className="toggle-text">
                {t('travel.notifications.tripApproaching', 'Trip Approaching Alert')}
              </span>
            </label>
            <p className="setting-description">
              {t('travel.notifications.tripApproachingDescription', 'Get a reminder before your trip starts')}
            </p>
          </div>

          {localSettings.tripApproachingEnabled && (
            <div className="setting-item sub-setting">
              <label>{t('travel.notifications.daysBeforeTrip', 'Days before trip:')}</label>
              <input
                type="number"
                min="1"
                max="30"
                value={localSettings.tripApproachingDays}
                onChange={(e) => handleChange('tripApproachingDays', parseInt(e.target.value) || 7)}
                className="number-input"
              />
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div className="settings-actions" variants={itemVariants}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Settings')}
          </button>

          {trip?.id && (
            <button
              className="btn-secondary"
              onClick={handleTestNotifications}
              disabled={testing}
            >
              {testing
                ? t('travel.notifications.checking', 'Checking...')
                : t('travel.notifications.testNotifications', 'Test Notifications')
              }
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default TravelNotificationSettings
