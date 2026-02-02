/**
 * App Entry Point
 * 
 * Shows a branded splash screen on app launch.
 * - First-time users: Goes to landing page
 * - Returning users: Goes directly to login (or dashboard if authenticated)
 */

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth';
import SplashScreen from '../components/SplashScreen';

// Storage key for first-time detection
const HAS_LAUNCHED_KEY = '@paire_has_launched';

export default function Index() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  // Check authentication and first-time status on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user has launched the app before
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        
        // Check if user is authenticated
        const session = await authService.getSession();

        if (session) {
          // User is authenticated - go to dashboard
          setNavigationTarget('/(app)/dashboard');
        } else if (hasLaunched === null) {
          // First time user - show landing page and mark as launched
          await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
          setNavigationTarget('/(auth)/landing');
        } else {
          // Returning user, not authenticated - go directly to login
          setNavigationTarget('/(auth)/login');
        }

        setIsReady(true);
      } catch (error) {
        // On error, default to landing page
        console.error('Initialization error:', error);
        setNavigationTarget('/(auth)/landing');
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // Handle splash screen finish
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Navigate once splash is done and we know where to go
  useEffect(() => {
    if (!showSplash && isReady && navigationTarget) {
      router.replace(navigationTarget);
    }
  }, [showSplash, isReady, navigationTarget, router]);

  // Always show splash screen initially
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} minDuration={2000} />;
  }

  // Show empty view while navigating
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
