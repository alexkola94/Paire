import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { reminderService } from '../services/api';
import './ReminderSettings.css';

/**
 * Reminder Settings Page
 * Allows users to configure email reminder preferences
 */
function ReminderSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingReminders, setTestingReminders] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [settings, setSettings] = useState({
    emailEnabled: true,
    billRemindersEnabled: true,
    billReminderDays: 3,
    loanRemindersEnabled: true,
    loanReminderDays: 7,
    budgetAlertsEnabled: true,
    budgetAlertThreshold: 90,
    savingsMilestonesEnabled: true
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reminderService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
      showMessage('error', t('reminders.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await reminderService.updateSettings(settings);
      showMessage('success', t('reminders.settingsSaved'));
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      showMessage('error', t('reminders.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleTestReminders = async () => {
    try {
      setTestingReminders(true);
      const result = await reminderService.checkReminders();

      if (result.success) {
        const count = result.remindersSent || 0;
        if (count > 0) {
          showMessage('success', t('reminders.remindersTestedCount', { count }));
        } else {
          showMessage('success', t('reminders.remindersTested'));
        }
      } else {
        showMessage('error', result.message || t('reminders.errorTestingReminders'));
      }
    } catch (error) {
      console.error('Error testing reminders:', error);
      showMessage('error', t('reminders.errorTestingReminders'));
    } finally {
      setTestingReminders(false);
    }
  };


  if (loading) {
    return (
      <div className="reminder-settings-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="reminder-settings-container">
      <div className="reminder-settings-header">
        <h1>{t('reminders.title')}</h1>
        <p className="subtitle">{t('reminders.subtitle')}</p>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="reminder-settings-content">
        {/* Master Toggle */}
        <div className="settings-section">
          <div className="section-header">
            <h2>📧 {t('reminders.emailNotifications')}</h2>
          </div>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => handleChange('emailEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{t('reminders.enableEmailNotifications')}</span>
            </label>
            <p className="setting-description">{t('reminders.emailDescription')}</p>
          </div>
        </div>

        {/* Bill Reminders */}
        <div className="settings-section">
          <div className="section-header">
            <h2>💰 {t('reminders.billReminders')}</h2>
          </div>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.billRemindersEnabled}
                onChange={(e) => handleChange('billRemindersEnabled', e.target.checked)}
                disabled={!settings.emailEnabled}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{t('reminders.enableBillReminders')}</span>
            </label>
            <p className="setting-description">{t('reminders.billDescription')}</p>
          </div>
          <div className="setting-item">
            <label>
              {t('reminders.remindMeBefore')}
              <input
                type="number"
                min="1"
                max="30"
                value={settings.billReminderDays}
                onChange={(e) => handleChange('billReminderDays', parseInt(e.target.value))}
                disabled={!settings.emailEnabled || !settings.billRemindersEnabled}
                className="number-input"
              />
              {t('reminders.days')}
            </label>
          </div>
        </div>

        {/* Loan Reminders */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🏦 {t('reminders.loanReminders')}</h2>
          </div>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.loanRemindersEnabled}
                onChange={(e) => handleChange('loanRemindersEnabled', e.target.checked)}
                disabled={!settings.emailEnabled}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{t('reminders.enableLoanReminders')}</span>
            </label>
            <p className="setting-description">{t('reminders.loanDescription')}</p>
          </div>
          <div className="setting-item">
            <label>
              {t('reminders.remindMeBefore')}
              <input
                type="number"
                min="1"
                max="30"
                value={settings.loanReminderDays}
                onChange={(e) => handleChange('loanReminderDays', parseInt(e.target.value))}
                disabled={!settings.emailEnabled || !settings.loanRemindersEnabled}
                className="number-input"
              />
              {t('reminders.days')}
            </label>
          </div>
        </div>

        {/* Budget Alerts */}
        <div className="settings-section">
          <div className="section-header">
            <h2>📊 {t('reminders.budgetAlerts')}</h2>
          </div>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.budgetAlertsEnabled}
                onChange={(e) => handleChange('budgetAlertsEnabled', e.target.checked)}
                disabled={!settings.emailEnabled}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{t('reminders.enableBudgetAlerts')}</span>
            </label>
            <p className="setting-description">{t('reminders.budgetDescription')}</p>
          </div>
          <div className="setting-item">
            <label>
              {t('reminders.alertWhenReaches')}
              <input
                type="number"
                min="50"
                max="100"
                step="5"
                value={settings.budgetAlertThreshold}
                onChange={(e) => handleChange('budgetAlertThreshold', parseInt(e.target.value))}
                disabled={!settings.emailEnabled || !settings.budgetAlertsEnabled}
                className="number-input"
              />
              %
            </label>
          </div>
        </div>

        {/* Savings Goals */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🎯 {t('reminders.savingsGoals')}</h2>
          </div>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.savingsMilestonesEnabled}
                onChange={(e) => handleChange('savingsMilestonesEnabled', e.target.checked)}
                disabled={!settings.emailEnabled}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">{t('reminders.enableSavingsNotifications')}</span>
            </label>
            <p className="setting-description">{t('reminders.savingsDescription')}</p>
          </div>
        </div>

        {/* Test Reminders Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>🧪 {t('reminders.testReminders')}</h2>
          </div>
          <div className="setting-item">
            <p className="setting-description">{t('reminders.testRemindersDescription')}</p>
            <button
              onClick={handleTestReminders}
              disabled={testingReminders || !settings.emailEnabled}
              className="btn btn-secondary"
              style={{ marginTop: '10px' }}
            >
              {testingReminders ? t('reminders.testingReminders') : t('reminders.testReminders')}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReminderSettings;

