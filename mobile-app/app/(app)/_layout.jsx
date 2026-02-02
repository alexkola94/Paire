/**
 * App Layout with Custom Tab Bar
 * 
 * Main navigation layout featuring:
 * - Custom TabBarWithFAB for quick transaction entry
 * - 4 visible tabs: Dashboard, Finance, Tools, Profile
 * - Bottom sheets for Finance and Tools feature hubs
 * - All other screens accessible via navigation
 */

import { useEffect, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, Wallet, Wrench, User } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { TabBarWithFAB, FinanceHubSheet, ToolsHubSheet } from '../../components';

export default function AppLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Hub sheet states
  const [isFinanceHubOpen, setIsFinanceHubOpen] = useState(false);
  const [isToolsHubOpen, setIsToolsHubOpen] = useState(false);

  // Auth check on mount
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/(auth)/login');
    }
  }, []);

  // Custom tab bar component with FAB
  const renderTabBar = useCallback((props) => {
    return (
      <TabBarWithFAB
        {...props}
        onFinancePress={() => setIsFinanceHubOpen(true)}
        onToolsPress={() => setIsToolsHubOpen(true)}
      />
    );
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          // Theme-aware colors for fallback
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textLight,
        }}
        tabBar={renderTabBar}
      >
        {/* Visible tabs in tab bar (4 tabs + FAB in center) */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('navigation.dashboard'),
            tabBarIcon: ({ color, focused }) => (
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('navigation.transactions', 'Transactions'),
            tabBarIcon: ({ color, focused }) => (
              <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('navigation.analytics', 'Analytics'),
            tabBarIcon: ({ color, focused }) => (
              <Wrench size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('navigation.profile'),
            tabBarIcon: ({ color, focused }) => (
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />

        {/* Hidden from tab bar but navigable via bottom sheets and direct links */}
        <Tabs.Screen name="expenses" options={{ href: null }} />
        <Tabs.Screen name="income" options={{ href: null }} />
        <Tabs.Screen name="budgets" options={{ href: null }} />
        <Tabs.Screen name="savings-goals" options={{ href: null }} />
        <Tabs.Screen name="loans" options={{ href: null }} />
        <Tabs.Screen name="recurring-bills" options={{ href: null }} />
        <Tabs.Screen name="receipts" options={{ href: null }} />
        <Tabs.Screen name="partnership" options={{ href: null }} />
        <Tabs.Screen name="shopping-lists" options={{ href: null }} />
        <Tabs.Screen name="reminders" options={{ href: null }} />
        <Tabs.Screen name="achievements" options={{ href: null }} />
        <Tabs.Screen name="economic-news" options={{ href: null }} />
        <Tabs.Screen name="currency-calculator" options={{ href: null }} />
        <Tabs.Screen name="travel" options={{ href: null }} />
        <Tabs.Screen name="chatbot" options={{ href: null }} />
        <Tabs.Screen name="admin" options={{ href: null }} />
      </Tabs>

      {/* Feature Hub Bottom Sheets */}
      <FinanceHubSheet
        isOpen={isFinanceHubOpen}
        onClose={() => setIsFinanceHubOpen(false)}
      />
      <ToolsHubSheet
        isOpen={isToolsHubOpen}
        onClose={() => setIsToolsHubOpen(false)}
      />
    </>
  );
}
