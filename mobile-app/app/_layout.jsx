import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../context/ThemeContext';
import { PrivacyModeProvider } from '../context/PrivacyModeContext';
import { DashboardLayoutProvider } from '../context/DashboardLayoutContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ToastProvider } from '../components';
import { loadAuthData, setSessionExpiredCallback } from '../services/auth';
import { setApiSessionExpiredCallback } from '../services/api';
import { useRouter } from 'expo-router';
import '../i18n/config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <PrivacyModeProvider>
              <DashboardLayoutProvider>
                <NotificationProvider>
                  <ToastProvider>
                <StatusBar style="auto" />
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
                  <Stack.Screen name="(app)" />
                </Stack>
                  </ToastProvider>
                </NotificationProvider>
              </DashboardLayoutProvider>
            </PrivacyModeProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
