/**
 * Notification Settings Screen
 * 
 * Configure push notification preferences.
 * Features:
 * - Enable/disable push notifications
 * - Toggle individual notification categories
 * - Configure reminder timing
 * - Test notification functionality
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  Wallet,
  PiggyBank,
  Users,
  Shield,
  Send,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Button, useToast, ScreenHeader } from '../../components';
import { scheduleLocalNotification } from '../../services/notifications';

// Notification category configuration
const NOTIFICATION_CATEGORIES = [
  {
    id: 'billReminders',
    icon: Bell,
    titleKey: 'pushNotifications.categories.billReminders',
    descKey: 'pushNotifications.categories.billRemindersDesc',
    hasTimingSetting: true,
    timingKey: 'billReminderDays',
  },
  {
    id: 'budgetAlerts',
    icon: Wallet,
    titleKey: 'pushNotifications.categories.budgetAlerts',
    descKey: 'pushNotifications.categories.budgetAlertsDesc',
    hasThresholdSetting: true,
    thresholdKey: 'budgetThreshold',
  },
  {
    id: 'savingsMilestones',
    icon: PiggyBank,
    titleKey: 'pushNotifications.categories.savingsMilestones',
    descKey: 'pushNotifications.categories.savingsMilestonesDesc',
  },
  {
    id: 'partnerActivity',
    icon: Users,
    titleKey: 'pushNotifications.categories.partnerActivity',
    descKey: 'pushNotifications.categories.partnerActivityDesc',
  },
  {
    id: 'securityAlerts',
    icon: Shield,
    titleKey: 'pushNotifications.categories.securityAlerts',
    descKey: 'pushNotifications.categories.securityAlertsDesc',
  },
];

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const {
    preferences,
    updatePreferences,
    enablePushNotifications,
    disablePushNotifications,
    pushToken,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);

  // Toggle main push notification setting
  const handleToggleNotifications = useCallback(async () => {
    if (preferences.enabled) {
      await disablePushNotifications();
      showToast(t('pushNotifications.disabled', 'Push notifications disabled'), 'info');
    } else {
      setIsEnabling(true);
      const success = await enablePushNotifications();
      setIsEnabling(false);
      
      if (success) {
        showToast(t('pushNotifications.enabled', 'Push notifications enabled'), 'success');
      } else {
        Alert.alert(
          t('pushNotifications.permissionRequired', 'Permission Required'),
          t('pushNotifications.permissionDenied', 'Push notifications permission was denied. Please enable it in your device settings.')
        );
      }
    }
  }, [preferences.enabled, enablePushNotifications, disablePushNotifications, showToast, t]);

  // Toggle a category setting
  const handleToggleCategory = useCallback(async (categoryId) => {
    await updatePreferences({ [categoryId]: !preferences[categoryId] });
  }, [preferences, updatePreferences]);

  // Update timing setting
  const handleTimingChange = useCallback(async (key, value) => {
    await updatePreferences({ [key]: value });
  }, [updatePreferences]);

  // Send test notification
  const handleTestNotification = useCallback(async () => {
    try {
      await scheduleLocalNotification({
        title: t('pushNotifications.testNotification.title', 'Test Notification'),
        body: t('pushNotifications.testNotification.sent', 'This is a test notification from Paire!'),
        data: { type: 'test' },
      });
      showToast(t('pushNotifications.testNotification.sent', 'Test notification sent!'), 'success');
    } catch (error) {
      showToast(t('pushNotifications.testNotification.error', 'Failed to send test notification'), 'error');
    }
  }, [showToast, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('pushNotifications.title', 'Push Notifications')}
        onBack={() => router.back()}
      />
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Toggle */}
        <View style={[
          styles.mainToggle, 
          { 
            backgroundColor: preferences.enabled 
              ? theme.colors.primary + '15' 
              : theme.colors.surfaceSecondary,
            borderColor: preferences.enabled 
              ? theme.colors.primary + '40' 
              : theme.colors.glassBorder,
          },
        ]}>
          <View style={[
            styles.mainIconContainer,
            { backgroundColor: preferences.enabled ? theme.colors.primary : theme.colors.textLight }
          ]}>
            {preferences.enabled ? (
              <Bell size={24} color="#fff" />
            ) : (
              <BellOff size={24} color="#fff" />
            )}
          </View>
          <View style={styles.mainToggleText}>
            <Text style={[styles.mainToggleTitle, { color: theme.colors.text }]}>
              {preferences.enabled 
                ? t('pushNotifications.enable', 'Push Notifications Enabled')
                : t('pushNotifications.disable', 'Push Notifications Disabled')
              }
            </Text>
            <Text style={[styles.mainToggleDesc, { color: theme.colors.textSecondary }]}>
              {t('pushNotifications.permissionDescription', 'We need your permission to send you important financial alerts.')}
            </Text>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: theme.colors.surfaceSecondary, true: theme.colors.primary + '60' }}
            thumbColor={preferences.enabled ? theme.colors.primary : theme.colors.textLight}
            disabled={isEnabling}
          />
        </View>

        {/* Category Settings */}
        {preferences.enabled && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('pushNotifications.categories.title', 'Notification Categories')}
            </Text>

            <View style={[styles.categoriesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
              {NOTIFICATION_CATEGORIES.map((category, index) => {
                const IconComponent = category.icon;
                const isEnabled = preferences[category.id];
                const isLast = index === NOTIFICATION_CATEGORIES.length - 1;

                return (
                  <View
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.glassBorder },
                    ]}
                  >
                    <View style={[
                      styles.categoryIcon,
                      { backgroundColor: isEnabled ? theme.colors.primary + '15' : theme.colors.surfaceSecondary }
                    ]}>
                      <IconComponent 
                        size={18} 
                        color={isEnabled ? theme.colors.primary : theme.colors.textSecondary} 
                      />
                    </View>
                    <View style={styles.categoryText}>
                      <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
                        {t(category.titleKey)}
                      </Text>
                      <Text style={[styles.categoryDesc, { color: theme.colors.textSecondary }]}>
                        {t(category.descKey)}
                      </Text>
                      
                      {/* Timing setting for bill reminders */}
                      {category.hasTimingSetting && isEnabled && (
                        <View style={styles.timingRow}>
                          <Text style={[styles.timingLabel, { color: theme.colors.textSecondary }]}>
                            {t('pushNotifications.timing.daysBefore', 'Days before due date')}:
                          </Text>
                          <View style={styles.timingButtons}>
                            {[1, 3, 5, 7].map((days) => (
                              <TouchableOpacity
                                key={days}
                                style={[
                                  styles.timingBtn,
                                  { 
                                    backgroundColor: preferences[category.timingKey] === days 
                                      ? theme.colors.primary 
                                      : theme.colors.surfaceSecondary 
                                  }
                                ]}
                                onPress={() => handleTimingChange(category.timingKey, days)}
                              >
                                <Text style={[
                                  styles.timingBtnText,
                                  { 
                                    color: preferences[category.timingKey] === days 
                                      ? '#fff' 
                                      : theme.colors.text 
                                  }
                                ]}>
                                  {days}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                      
                      {/* Threshold setting for budget alerts */}
                      {category.hasThresholdSetting && isEnabled && (
                        <View style={styles.timingRow}>
                          <Text style={[styles.timingLabel, { color: theme.colors.textSecondary }]}>
                            {t('pushNotifications.timing.budgetThreshold', 'Alert at')}:
                          </Text>
                          <View style={styles.timingButtons}>
                            {[50, 75, 80, 90].map((pct) => (
                              <TouchableOpacity
                                key={pct}
                                style={[
                                  styles.timingBtn,
                                  { 
                                    backgroundColor: preferences[category.thresholdKey] === pct 
                                      ? theme.colors.primary 
                                      : theme.colors.surfaceSecondary 
                                  }
                                ]}
                                onPress={() => handleTimingChange(category.thresholdKey, pct)}
                              >
                                <Text style={[
                                  styles.timingBtnText,
                                  { 
                                    color: preferences[category.thresholdKey] === pct 
                                      ? '#fff' 
                                      : theme.colors.text 
                                  }
                                ]}>
                                  {pct}%
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => handleToggleCategory(category.id)}
                      trackColor={{ false: theme.colors.surfaceSecondary, true: theme.colors.primary + '60' }}
                      thumbColor={isEnabled ? theme.colors.primary : theme.colors.textLight}
                    />
                  </View>
                );
              })}
            </View>

            {/* Test Notification Button */}
            <View style={styles.testSection}>
              <Button
                title={t('pushNotifications.testNotification.send', 'Send Test Notification')}
                onPress={handleTestNotification}
                leftIcon={Send}
                variant="secondary"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.tabBarBottomClearance,
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  mainIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainToggleText: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  mainToggleTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  mainToggleDesc: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  categoriesCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  categoryText: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  categoryTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDesc: {
    ...typography.caption,
  },
  timingRow: {
    marginTop: spacing.sm,
  },
  timingLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  timingButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timingBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  timingBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  testSection: {
    marginTop: spacing.md,
  },
});
