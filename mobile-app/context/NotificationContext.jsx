/**
 * NotificationContext
 * 
 * Manages push notification state and preferences.
 * Handles notification initialization and response handling.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  getNotificationPreferences,
  saveNotificationPreferences,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  cancelAllNotifications,
  DEFAULT_NOTIFICATION_PREFS,
} from '../services/notifications';

const NotificationContext = createContext(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const router = useRouter();
  const [pushToken, setPushToken] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);
  
  // Refs for listeners
  const notificationListener = useRef();
  const responseListener = useRef();
  
  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
    
    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
  
  // Initialize push notifications
  const initializeNotifications = useCallback(async () => {
    try {
      // Load saved preferences
      const savedPrefs = await getNotificationPreferences();
      setPreferences(savedPrefs);
      
      // Register for push notifications if enabled
      if (savedPrefs.enabled) {
        const token = await registerForPushNotifications();
        setPushToken(token);
      }
      
      // Set up notification received listener
      notificationListener.current = addNotificationReceivedListener((notification) => {
        setLastNotification(notification);
      });
      
      // Set up notification response listener (when user taps notification)
      responseListener.current = addNotificationResponseListener(handleNotificationResponse);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setIsInitialized(true);
    }
  }, []);
  
  // Handle notification tap response
  const handleNotificationResponse = useCallback((response) => {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    switch (data?.type) {
      case 'bill_reminder':
        router.push('/(app)/recurring-bills');
        break;
      case 'budget_alert':
        router.push('/(app)/budgets');
        break;
      case 'savings_milestone':
        router.push('/(app)/savings-goals');
        break;
      case 'partner_activity':
        router.push('/(app)/partnership');
        break;
      case 'security_alert':
        router.push('/(app)/(tabs)/profile');
        break;
      default:
        // Default to dashboard
        router.push('/(app)/(tabs)/dashboard');
    }
  }, [router]);
  
  // Update notification preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    const merged = { ...preferences, ...newPrefs };
    setPreferences(merged);
    await saveNotificationPreferences(merged);
    
    // If notifications were enabled, register for push
    if (newPrefs.enabled && !pushToken) {
      const token = await registerForPushNotifications();
      setPushToken(token);
    }
    
    // If notifications were disabled, cancel all scheduled
    if (newPrefs.enabled === false) {
      await cancelAllNotifications();
    }
  }, [preferences, pushToken]);
  
  // Enable push notifications
  const enablePushNotifications = useCallback(async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setPushToken(token);
      await updatePreferences({ enabled: true });
      return true;
    }
    return false;
  }, [updatePreferences]);
  
  // Disable push notifications
  const disablePushNotifications = useCallback(async () => {
    await cancelAllNotifications();
    await updatePreferences({ enabled: false });
    setPushToken(null);
  }, [updatePreferences]);
  
  const value = {
    pushToken,
    preferences,
    isInitialized,
    lastNotification,
    updatePreferences,
    enablePushNotifications,
    disablePushNotifications,
    handleNotificationResponse,
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
