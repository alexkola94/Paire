/**
 * Tabs Layout (nested under App Drawer)
 *
 * Custom TabBarWithFAB for quick transaction entry.
 * 4 visible tabs: Dashboard, Transactions, Bills, Profile.
 * Hub sheets and GlobalCalculator remain here for tab screens.
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Image } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Home, Wallet, Repeat, User } from 'lucide-react-native';
import { authService } from '../../../services/auth';
import { profileService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { CalculatorProvider } from '../../../context/CalculatorContext';
import { OverlayProvider } from '../../../context/OverlayContext';
import { TabTransitionProvider } from '../../../context/TabTransitionContext';
import { TabBarWithFAB, FinanceHubSheet, ToolsHubSheet, GlobalCalculator } from '../../../components';

const PROFILE_AVATAR_SIZE = 22;

export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileService.getMyProfile(),
  });
  const avatarUrl = profile?.avatar_url ?? profile?.avatarUrl;

  const [isFinanceHubOpen, setIsFinanceHubOpen] = useState(false);
  const [isToolsHubOpen, setIsToolsHubOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/(auth)/login');
    }
  }, []);

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
    <CalculatorProvider>
      <OverlayProvider>
        <TabTransitionProvider>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 10,
                shadowOpacity: 0,
                zIndex: 10,
              },
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textLight,
            }}
            tabBar={renderTabBar}
          >
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
              name="bills"
              options={{
                title: t('navigation.bills', 'Bills'),
                tabBarIcon: ({ color, focused }) => (
                  <Repeat size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
                ),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: t('navigation.profile'),
                tabBarIcon: ({ color, focused }) =>
                  avatarUrl ? (
                    <View style={{ width: PROFILE_AVATAR_SIZE, height: PROFILE_AVATAR_SIZE, borderRadius: PROFILE_AVATAR_SIZE / 2, overflow: 'hidden' }}>
                      <Image source={{ uri: avatarUrl }} style={{ width: PROFILE_AVATAR_SIZE, height: PROFILE_AVATAR_SIZE }} resizeMode="cover" />
                    </View>
                  ) : (
                    <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
                  ),
              }}
            />
          </Tabs>

          <FinanceHubSheet
            isOpen={isFinanceHubOpen}
            onClose={() => setIsFinanceHubOpen(false)}
          />
          <ToolsHubSheet
            isOpen={isToolsHubOpen}
            onClose={() => setIsToolsHubOpen(false)}
          />
          <GlobalCalculator />
        </TabTransitionProvider>
      </OverlayProvider>
    </CalculatorProvider>
  );
}
