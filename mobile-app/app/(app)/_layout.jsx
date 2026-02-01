import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, TrendingDown, Plus, TrendingUp, User } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function AppLayout() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/(auth)/login');
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.glassBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('navigation.dashboard'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('navigation.expenses'),
          tabBarIcon: ({ color, size }) => <TrendingDown size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('navigation.transactions'),
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t('navigation.income'),
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hide these from tab bar but keep them navigable */}
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="savings-goals" options={{ href: null }} />
      <Tabs.Screen name="loans" options={{ href: null }} />
      <Tabs.Screen name="recurring-bills" options={{ href: null }} />
      <Tabs.Screen name="receipts" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="partnership" options={{ href: null }} />
      <Tabs.Screen name="shopping-lists" options={{ href: null }} />
      <Tabs.Screen name="reminders" options={{ href: null }} />
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="economic-news" options={{ href: null }} />
      <Tabs.Screen name="currency-calculator" options={{ href: null }} />
      <Tabs.Screen name="travel" options={{ href: null }} />
      <Tabs.Screen name="chatbot" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="linked-accounts" options={{ href: null }} />
    </Tabs>
  );
}
