/**
 * App Layout – Drawer + Tabs
 *
 * Drawer wraps the app: custom drawer content (Logo Hero + nav links + footer).
 * Main content is the (tabs) group (Dashboard, Transactions, Bills, Profile).
 * Other screens (expenses, loans, etc.) remain under (app) and are linked from the drawer.
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ScrollToTopProvider } from '../../context/ScrollToTopContext';
import { LogoutProvider } from '../../context/LogoutContext';
import { CalculatorProvider } from '../../context/CalculatorContext';
import { OverlayProvider } from '../../context/OverlayContext';
import { authService } from '../../services/auth';
import AppDrawerContent from '../../components/navigation/AppDrawerContent';
import LogoutLoadingOverlay from '../../components/LogoutLoadingOverlay';
import GlobalCalculator from '../../components/GlobalCalculator';

// Default route when opening the app group (tabs = main content)
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function AppLayout() {
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/(auth)/login');
    }
  }, []);

  return (
    <LogoutProvider>
      <ScrollToTopProvider>
        <CalculatorProvider>
          <OverlayProvider>
            <View style={styles.wrapper}>
              <Drawer
                screenOptions={{
                  headerShown: false,
                  drawerType: 'front',
                  drawerStyle: { width: 280, maxWidth: '85%', backgroundColor: theme.colors.background },
                  drawerActiveTintColor: theme.colors.primary,
                  drawerInactiveTintColor: theme.colors.textSecondary,
                  swipeEdgeWidth: 24,
                }}
                drawerContent={(props) => <AppDrawerContent {...props} />}
              />
              <LogoutLoadingOverlay />
              <GlobalCalculator />
            </View>
          </OverlayProvider>
        </CalculatorProvider>
      </ScrollToTopProvider>
    </LogoutProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
