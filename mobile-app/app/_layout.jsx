import { useEffect, useState } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { PrivacyModeProvider } from '../context/PrivacyModeContext';
import { DashboardLayoutProvider } from '../context/DashboardLayoutContext';
import { NotificationProvider } from '../context/NotificationContext';
import { OnboardingProvider } from '../context/OnboardingContext';
// Partnership SignalR commented out for now
// import { PartnerSyncProvider } from '../context/PartnerSyncContext';
import { BiometricProvider, useBiometric } from '../context/BiometricContext';
import { ToastProvider } from '../components';
import BiometricLockScreen from '../components/BiometricLockScreen';
import { loadAuthData, setSessionExpiredCallback } from '../services/auth';
import { setApiSessionExpiredCallback } from '../services/api';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import '../i18n/config';

/**
 * StatusBarManager Component
 * Manages status bar style based on current theme.
 * Must be rendered inside ThemeProvider.
 */
function StatusBarManager() {
  const { isDark } = useTheme();
  // Use 'light' content (white icons) for dark mode, 'dark' content (black icons) for light mode
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

/**
 * BiometricGate Component
 * Always keeps the Stack mounted so navigation works; shows lock screen as overlay when locked.
 * Must be rendered inside BiometricProvider
 */
function BiometricGate({ children }) {
  const { isLocked } = useBiometric();

  return (
    <View style={styles.gateContainer}>
      {children}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <BiometricLockScreen />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootBackground: {
    flex: 1,
  },
  gateContainer: {
    flex: 1,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

// System theme backgrounds so the root is never white (avoids flash before ThemeProvider paints)
const LIGHT_ROOT_BG = colors.bgPrimary;
const DARK_ROOT_BG = colors.dark.bgPrimary;

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const init = async () => {
      // Set up session expiration handler
      const handleExpired = () => {
        router.replace('/(auth)/login');
      };
      setSessionExpiredCallback(handleExpired);
      setApiSessionExpiredCallback(handleExpired);

      // Load stored auth data
      await loadAuthData();
      setIsReady(true);
    };

    init();
  }, []);

  if (!isReady) return null;

  const rootBackgroundColor = colorScheme === 'dark' ? DARK_ROOT_BG : LIGHT_ROOT_BG;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.rootBackground, { backgroundColor: rootBackgroundColor }]}>
        <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBarManager />
            <PrivacyModeProvider>
              <DashboardLayoutProvider>
                <NotificationProvider>
                  <OnboardingProvider>
                    <BiometricProvider>
                      <ToastProvider>
                        {/* Partnership SignalR commented out for now
                        <PartnerSyncProvider> */}
                          <BiometricGate>
                            <Stack
                              screenOptions={{
                                headerShown: false,
                                gestureEnabled: true,
                                fullScreenGestureEnabled: true,
                                fullScreenGestureShadowEnabled: true,
                                animationMatchesGesture: true,
                                sheetGrabberVisible: false,
                                sheetExpandsWhenScrolledToEdge: true,
                                sheetShouldOverflowTopInset: false,
                                sheetResizeAnimationEnabled: true,
                                freezeOnBlur: false,
                                autoHideHomeIndicator: false,
                                keyboardHandlingEnabled: true,
                                navigationBarTranslucent: false,
                                navigationBarHidden: false,
                                statusBarHidden: false,
                                statusBarTranslucent: false,
                              }}
                            >
                              <Stack.Screen name="(auth)" />
                              <Stack.Screen name="(onboarding)" />
                              <Stack.Screen name="(app)" />
                            </Stack>
                          </BiometricGate>
                        {/* </PartnerSyncProvider> */}
                      </ToastProvider>
                    </BiometricProvider>
                  </OnboardingProvider>
                </NotificationProvider>
              </DashboardLayoutProvider>
            </PrivacyModeProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
