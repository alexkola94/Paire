/**
 * Reminder Settings Screen (React Native)
 * Grouped toggles: email notifications, bill reminders, loan reminders,
 * budget alerts, savings goals; optional test reminders button.
 * Uses reminderService.getSettings() / updateSettings(); optional sendTestEmail/checkReminders.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows, colors } from '../../constants/theme';
import { ScreenHeader } from '../../components';
import FormSection from '../../components/FormSection';

// Default settings shape (matches backend)
const defaultSettings = {
  emailEnabled: true,
  billRemindersEnabled: true,
  billReminderDays: 3,
  loanRemindersEnabled: true,
  loanReminderDays: 7,
  budgetAlertsEnabled: true,
  budgetAlertThreshold: 90,
  savingsMilestonesEnabled: true,
};

export default function RemindersScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ type: null, text: '' });

  const { data: settings = defaultSettings, isLoading } = useQuery({
    queryKey: ['reminder-settings'],
    queryFn: () => reminderService.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => reminderService.updateSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
      setMessage({ type: 'success', text: t('reminders.settingsSaved') });
      setTimeout(() => setMessage({ type: null, text: '' }), 4000);
    },
    onError: () => {
      setMessage({ type: 'error', text: t('reminders.errorSaving') });
      setTimeout(() => setMessage({ type: null, text: '' }), 4000);
    },
  });

  const toggle = (key, value) => {
    updateMutation.mutate({ ...settings, [key]: value });
  };

  const handleTestReminders = async () => {
    try {
      const result = await reminderService.checkReminders();
      if (result?.success) {
        const count = result.remindersSent ?? 0;
        const text = count > 0
          ? t('reminders.remindersTestedCount', { count })
          : t('reminders.remindersTested');
        setMessage({ type: 'success', text });
      } else {
        setMessage({ type: 'error', text: result?.message || t('reminders.errorTestingReminders') });
      }
    } catch {
      setMessage({ type: 'error', text: t('reminders.errorTestingReminders') });
    }
    setTimeout(() => setMessage((m) => (m.text ? m : { type: null, text: '' })), 4000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const emailDisabled = !settings.emailEnabled;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title={t('reminders.title')} />
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('reminders.subtitle')}
          </Text>

          {/* Message toast */}
          {message.text ? (
            <View
              style={[
                styles.message,
                {
                  backgroundColor:
                    message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderColor: message.type === 'success' ? '#10B981' : '#EF4444',
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: message.type === 'success' ? '#10B981' : '#EF4444' },
                ]}
              >
                {message.text}
              </Text>
            </View>
          ) : null}

          {/* Email Notifications */}
          <FormSection title={t('reminders.emailNotifications')} collapsible={false}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                {t('reminders.enableEmailNotifications')}
              </Text>
              <Switch
                value={settings.emailEnabled}
                onValueChange={(v) => toggle('emailEnabled', v)}
                trackColor={{ false: theme.colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
              {t('reminders.emailDescription')}
            </Text>
          </FormSection>

          {/* Bill Reminders */}
          <FormSection title={t('reminders.billReminders')} collapsible={false}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                {t('reminders.enableBillReminders')}
              </Text>
              <Switch
                value={settings.billRemindersEnabled}
                onValueChange={(v) => toggle('billRemindersEnabled', v)}
                disabled={emailDisabled}
                trackColor={{ false: theme.colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
              {t('reminders.billDescription')}
            </Text>
            <View style={[styles.numberRow, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.numberLabel, { color: theme.colors.text }]}>
                {t('reminders.remindMeBefore')}
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.surfaceSecondary,
                  },
                ]}
                value={String(settings.billReminderDays ?? 3)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 1 && n <= 30) toggle('billReminderDays', n);
                }}
                keyboardType="number-pad"
                editable={!emailDisabled && settings.billRemindersEnabled}
              />
              <Text style={[styles.numberSuffix, { color: theme.colors.textSecondary }]}>
                {t('reminders.days')}
              </Text>
            </View>
          </FormSection>

          {/* Loan Reminders */}
          <FormSection title={t('reminders.loanReminders')} collapsible={false}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                {t('reminders.enableLoanReminders')}
              </Text>
              <Switch
                value={settings.loanRemindersEnabled}
                onValueChange={(v) => toggle('loanRemindersEnabled', v)}
                disabled={emailDisabled}
                trackColor={{ false: theme.colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
              {t('reminders.loanDescription')}
            </Text>
            <View style={[styles.numberRow, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.numberLabel, { color: theme.colors.text }]}>
                {t('reminders.remindMeBefore')}
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.surfaceSecondary,
                  },
                ]}
                value={String(settings.loanReminderDays ?? 7)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 1 && n <= 30) toggle('loanReminderDays', n);
                }}
                keyboardType="number-pad"
                editable={!emailDisabled && settings.loanRemindersEnabled}
              />
              <Text style={[styles.numberSuffix, { color: theme.colors.textSecondary }]}>
                {t('reminders.days')}
              </Text>
            </View>
          </FormSection>

          {/* Budget Alerts */}
          <FormSection title={t('reminders.budgetAlerts')} collapsible={false}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                {t('reminders.enableBudgetAlerts')}
              </Text>
              <Switch
                value={settings.budgetAlertsEnabled}
                onValueChange={(v) => toggle('budgetAlertsEnabled', v)}
                disabled={emailDisabled}
                trackColor={{ false: theme.colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
              {t('reminders.budgetDescription')}
            </Text>
            <View style={[styles.numberRow, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.numberLabel, { color: theme.colors.text }]}>
                {t('reminders.alertWhenReaches')}
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.surfaceSecondary,
                  },
                ]}
                value={String(settings.budgetAlertThreshold ?? 90)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 50 && n <= 100) toggle('budgetAlertThreshold', n);
                }}
                keyboardType="number-pad"
                editable={!emailDisabled && settings.budgetAlertsEnabled}
              />
              <Text style={[styles.numberSuffix, { color: theme.colors.textSecondary }]}>%</Text>
            </View>
          </FormSection>

          {/* Savings Goals */}
          <FormSection title={t('reminders.savingsGoals')} collapsible={false}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                {t('reminders.enableSavingsNotifications')}
              </Text>
              <Switch
                value={settings.savingsMilestonesEnabled}
                onValueChange={(v) => toggle('savingsMilestonesEnabled', v)}
                disabled={emailDisabled}
                trackColor={{ false: theme.colors.surfaceSecondary, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
              {t('reminders.savingsDescription')}
            </Text>
          </FormSection>

          {/* Test Reminders */}
          <FormSection title={t('reminders.testReminders')} collapsible={false}>
            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary, marginBottom: spacing.sm }]}>
              {t('reminders.testRemindersDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.colors.surfaceSecondary }]}
              onPress={handleTestReminders}
              disabled={emailDisabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.testButtonText,
                  {
                    color: emailDisabled ? theme.colors.textLight : theme.colors.text,
                  },
                ]}
              >
                {t('reminders.testReminders')}
              </Text>
            </TouchableOpacity>
          </FormSection>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: { ...typography.body, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  message: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  messageText: { ...typography.bodySmall },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  settingLabel: { ...typography.body, flex: 1, marginRight: spacing.sm },
  settingDesc: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  numberLabel: { ...typography.bodySmall, marginRight: spacing.sm },
  numberInput: {
    width: 56,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    ...typography.body,
  },
  numberSuffix: { ...typography.bodySmall, marginLeft: spacing.sm },
  testButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  testButtonText: { ...typography.body, fontWeight: '600' },
});
