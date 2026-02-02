/**
 * App Layout – Drawer + Tabs
 *
 * Drawer wraps the app: custom drawer content (Logo Hero + nav links + footer).
 * Main content is the (tabs) group (Dashboard, Transactions, Analytics, Profile).
 * Other screens (expenses, loans, etc.) remain under (app) and are linked from the drawer.
 */

import { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ScrollToTopProvider } from '../../context/ScrollToTopContext';
import { authService } from '../../services/auth';
import AppDrawerContent from '../../components/navigation/AppDrawerContent';

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
    <ScrollToTopProvider>
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 280, maxWidth: '85%' },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textSecondary,
        swipeEdgeWidth: 24,
      }}
      drawerContent={(props) => <AppDrawerContent {...props} />}
    />
    </ScrollToTopProvider>
  );
}
