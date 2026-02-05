/**
 * Push Notifications Service
 *
 * Handles push notification setup, permissions, and registration.
 * Uses Expo Notifications for cross-platform push notification support.
 * Channel names and notification content use i18n (no React hooks).
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/config';

// Storage keys
const PUSH_TOKEN_KEY = 'paire_push_token';
const NOTIFICATION_PREFS_KEY = 'paire_notification_prefs';
const LAST_WEEKLY_SUMMARY_KEY = 'paire_last_weekly_summary';

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFS = {
  enabled: true,
  billReminders: true,
  billReminderDays: 3,
  budgetAlerts: true,
  budgetThreshold: 80, // Alert when 80% of budget is used
  savingsMilestones: true,
  partnerActivity: true,
  securityAlerts: true,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export async function requestPermissions() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  return true;
}

/**
 * Register for push notifications and get Expo push token
 * @returns {Promise<string|null>} The push token or null if registration failed
 */
export async function registerForPushNotifications() {
  try {
    const permissionGranted = await requestPermissions();
    if (!permissionGranted) {
      return null;
    }

    // Get Expo project ID from config (EAS or app.json)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    // Skip push token registration if no valid project ID is configured
    // Local notifications will still work without a push token
    if (!projectId) {
      console.log('No Expo project ID configured - skipping push token registration. Local notifications still work.');
      return null;
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

    // Configure Android-specific channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });

      // Create channels for different notification types
      await Notifications.setNotificationChannelAsync('bills', {
        name: 'Bill Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Reminders for upcoming bill payments',
      });

      await Notifications.setNotificationChannelAsync('budgets', {
        name: 'Budget Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Alerts when approaching budget limits',
      });

      await Notifications.setNotificationChannelAsync('savings', {
        name: 'Savings Goals',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Notifications for savings milestones',
      });

      await Notifications.setNotificationChannelAsync('partnership', {
        name: 'Partner Activity',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Updates on shared financial activity',
      });

      await Notifications.setNotificationChannelAsync('security', {
        name: 'Security Alerts',
        importance: Notifications.AndroidImportance.MAX,
        description: 'Important security notifications',
      });
    }

    return token.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Get the stored push token
 * @returns {Promise<string|null>}
 */
export async function getStoredPushToken() {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Send push token to backend server
 * @param {string} token - The Expo push token
 * @param {string} userId - The user's ID
 */
export async function sendTokenToBackend(token, userId) {
  try {
    // TODO: Implement API call to send token to backend
    // await api.post('/notifications/register', { token, userId });
    console.log('Push token registered:', token, 'for user:', userId);
  } catch (error) {
    console.error('Error sending push token to backend:', error);
  }
}

/**
 * Schedule a local notification
 * @param {object} options - Notification options
 */
export async function scheduleLocalNotification({
  title,
  body,
  data = {},
  trigger = null,
  channelId = 'default',
}) {
  const notificationContent = {
    title,
    body,
    data,
    ...(Platform.OS === 'android' && { channelId }),
  };

  if (trigger) {
    return await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });
  }

  // Immediate notification
  return await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: null,
  });
}

/**
 * Schedule a bill reminder notification
 * @param {object} bill - The bill object
 * @param {number} daysBefore - Days before due date to remind
 */
export async function scheduleBillReminder(bill, daysBefore = 3) {
  const dueDate = new Date(bill.nextDueDate);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);

  // Don't schedule if reminder date is in the past
  if (reminderDate <= new Date()) {
    return null;
  }

  return await scheduleLocalNotification({
    title: i18n.t('notifications.billDueSoon'),
    body: i18n.t('notifications.billDueBody', {
      name: bill.name,
      amount: bill.amount,
      days: daysBefore,
    }),
    data: { type: 'bill_reminder', billId: bill.id },
    trigger: { date: reminderDate },
    channelId: 'bills',
  });
}

/**
 * Schedule a budget alert notification
 * @param {object} budget - The budget object
 * @param {number} percentage - Current spending percentage
 */
export async function sendBudgetAlert(budget, percentage) {
  return await scheduleLocalNotification({
    title: 'Budget Alert',
    body: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget`,
    data: { type: 'budget_alert', budgetId: budget.id },
    channelId: 'budgets',
  });
}

/**
 * Send a savings milestone notification
 * @param {object} goal - The savings goal object
 * @param {number} percentage - Current progress percentage
 */
export async function sendSavingsMilestone(goal, percentage) {
  return await scheduleLocalNotification({
    title: i18n.t('notifications.savingsMilestone'),
    body: i18n.t('notifications.savingsMilestoneBody', {
      percentage: percentage.toFixed(0),
      name: goal.name,
    }),
    data: { type: 'savings_milestone', goalId: goal.id },
    channelId: 'savings',
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Check if weekly spending summary should be shown (once per week on Sunday/Monday)
 * @returns {Promise<boolean>}
 */
export async function shouldShowWeeklySummary() {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.enabled) return false;

    const lastSummary = await AsyncStorage.getItem(LAST_WEEKLY_SUMMARY_KEY);
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday

    // Only show on Sunday (0) or Monday (1)
    if (dayOfWeek !== 0 && dayOfWeek !== 1) return false;

    if (lastSummary) {
      const lastDate = new Date(lastSummary);
      const daysSinceLastSummary = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      // Don't show if already shown within last 6 days
      if (daysSinceLastSummary < 6) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark weekly summary as shown
 */
export async function markWeeklySummaryShown() {
  try {
    await AsyncStorage.setItem(LAST_WEEKLY_SUMMARY_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error marking weekly summary shown:', error);
  }
}

/**
 * Calculate weekly spending from transactions
 * @param {Array} transactions - Array of transaction objects
 * @returns {object} { thisWeekTotal, lastWeekTotal, percentChange }
 */
export function calculateWeeklySpending(transactions) {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const endOfLastWeek = new Date(startOfThisWeek);
  endOfLastWeek.setMilliseconds(-1);

  let thisWeekTotal = 0;
  let lastWeekTotal = 0;

  (transactions || []).forEach((tx) => {
    if (tx.type?.toLowerCase() !== 'expense') return;
    const txDate = new Date(tx.date);
    const amount = Number(tx.amount) || 0;

    if (txDate >= startOfThisWeek) {
      thisWeekTotal += amount;
    } else if (txDate >= startOfLastWeek && txDate < startOfThisWeek) {
      lastWeekTotal += amount;
    }
  });

  let percentChange = 0;
  if (lastWeekTotal > 0) {
    percentChange = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
  }

  return { thisWeekTotal, lastWeekTotal, percentChange };
}

/**
 * Send weekly spending summary notification
 * @param {number} totalSpent - Total spent this week
 * @param {number} percentChange - Percent change vs last week
 */
export async function sendWeeklySummary(totalSpent, percentChange) {
  const formattedAmount = `€${totalSpent.toFixed(2)}`;
  let body;

  if (percentChange === 0 || isNaN(percentChange)) {
    body = i18n.t('notifications.weeklySummaryBody', {
      amount: formattedAmount,
      defaultValue: `This week you spent ${formattedAmount}.`,
    });
  } else {
    const changeText = percentChange > 0 ? 'more' : 'less';
    body = i18n.t('notifications.weeklySummaryWithChange', {
      amount: formattedAmount,
      percent: Math.abs(percentChange),
      change: changeText,
      defaultValue: `This week you spent ${formattedAmount}. That's ${Math.abs(percentChange)}% ${changeText} than last week.`,
    });
  }

  await markWeeklySummaryShown();

  return await scheduleLocalNotification({
    title: i18n.t('notifications.weeklySummaryTitle', 'Weekly Spending Summary'),
    body,
    data: { type: 'weekly_summary' },
    channelId: 'default',
  });
}

/**
 * Get notification preferences from storage
 * @returns {Promise<object>}
 */
export async function getNotificationPreferences() {
  try {
    const prefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (prefs) {
      return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(prefs) };
    }
    return DEFAULT_NOTIFICATION_PREFS;
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

/**
 * Save notification preferences to storage
 * @param {object} prefs - The preferences to save
 */
export async function saveNotificationPreferences(prefs) {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}

/**
 * Add notification response listener
 * @param {function} callback - Callback function for handling notification response
 * @returns {object} Subscription object
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 * @param {function} callback - Callback function for handling received notification
 * @returns {object} Subscription object
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get badge count
 * @returns {Promise<number>}
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 * @param {number} count - Badge count to set
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

export default {
  requestPermissions,
  registerForPushNotifications,
  getStoredPushToken,
  sendTokenToBackend,
  scheduleLocalNotification,
  scheduleBillReminder,
  sendBudgetAlert,
  sendSavingsMilestone,
  cancelAllNotifications,
  getNotificationPreferences,
  saveNotificationPreferences,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  getBadgeCount,
  setBadgeCount,
  DEFAULT_NOTIFICATION_PREFS,
  // Weekly spending summary
  shouldShowWeeklySummary,
  markWeeklySummaryShown,
  calculateWeeklySpending,
  sendWeeklySummary,
};
