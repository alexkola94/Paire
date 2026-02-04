/**
 * AppDrawerContent Component
 *
 * Custom drawer content: Logo Hero at top, nav links (Main, Finance, Tools),
 * footer with theme toggle and logout. Theme-aware; closes drawer on navigation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Wallet,
  User,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  CreditCard,
  BarChart3,
  Calculator,
  Receipt,
  Repeat,
  MapPin,
  ShoppingCart,
  Bell,
  Users,
  Trophy,
  Moon,
  LogOut,
  ChevronRight,
  Upload,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useScrollToTop } from '../../context/ScrollToTopContext';
import { useLogout } from '../../context/LogoutContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { authService } from '../../services/auth';
import { profileService } from '../../services/api';
import { spacing, borderRadius, typography } from '../../constants/theme';
import LogoHero from '../LogoHero';

/**
 * Returns true if the drawer state shows we're currently on the given (tabs) route.
 * state from drawer: when active route is (tabs), state.routes[state.index].state has nested tab state.
 */
function isCurrentlyOnRoute(state, route) {
  const active = state?.routes?.[state.index];
  if (!active) return false;
  // (tabs) route: check nested tab name
  if (active.name === '(tabs)' && active.state?.routes?.[active.state.index]) {
    const tabName = active.state.routes[active.state.index].name;
    if (route === '/(app)/(tabs)/dashboard' && tabName === 'dashboard') return true;
    if (route === '/(app)/(tabs)/transactions' && tabName === 'transactions') return true;
    if (route === '/(app)/(tabs)/bills' && tabName === 'bills') return true;
    if (route === '/(app)/(tabs)/profile' && tabName === 'profile') return true;
  }
  return false;
}

// Main tab routes (under (tabs))
const MAIN_ITEMS = [
  { route: '/(app)/(tabs)/dashboard', icon: Home, labelKey: 'navigation.dashboard' },
  { route: '/(app)/(tabs)/transactions', icon: Wallet, labelKey: 'navigation.transactions' },
  { route: '/(app)/(tabs)/bills', icon: Repeat, labelKey: 'navigation.bills' },
  { route: '/(app)/(tabs)/profile', icon: User, labelKey: 'navigation.profile' },
];

// Finance and tools (under (app))
const FINANCE_ITEMS = [
  { route: '/(app)/expenses', icon: TrendingDown, labelKey: 'navigation.expenses' },
  { route: '/(app)/income', icon: TrendingUp, labelKey: 'navigation.income' },
  { route: '/(app)/analytics', icon: BarChart3, labelKey: 'navigation.analytics' },
  { route: '/(app)/budgets', icon: Wallet, labelKey: 'navigation.budgets' },
  { route: '/(app)/savings-goals', icon: PiggyBank, labelKey: 'navigation.savingsGoals' },
  { route: '/(app)/loans', icon: CreditCard, labelKey: 'navigation.loans' },
];

// Bills is in Main (tabs); no duplicate Recurring Bills here (same content)
const TOOLS_ITEMS = [
  { route: '/(app)/currency-calculator', icon: Calculator, labelKey: 'navigation.currencyCalculator' },
  { route: '/(app)/bank-import', icon: Upload, labelKey: 'import.title' },
  { route: '/(app)/receipts', icon: Receipt, labelKey: 'receipts.title' },
];

const LIFESTYLE_ITEMS = [
  { route: '/(app)/travel', icon: MapPin, labelKey: 'travel.common.enterTravelMode' },
  { route: '/(app)/shopping-lists', icon: ShoppingCart, labelKey: 'navigation.shoppingLists' },
  { route: '/(app)/reminders', icon: Bell, labelKey: 'navigation.reminders' },
  { route: '/(app)/achievements', icon: Trophy, labelKey: 'navigation.achievements' },
  { route: '/(app)/partnership', icon: Users, labelKey: 'navigation.partnership' },
];

function DrawerItemRow({ icon: Icon, label, onPress, theme, destructive, accessibilityLabel, avatarUrl }) {
  const iconSize = 20;
  const avatarSize = 24;
  return (
    <TouchableOpacity
      style={[styles.itemRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.glassBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {avatarUrl ? (
        <View style={[styles.drawerAvatarWrap, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <Image source={{ uri: avatarUrl }} style={[styles.drawerAvatar, { width: avatarSize, height: avatarSize }]} resizeMode="cover" />
        </View>
      ) : (
        <Icon size={iconSize} color={destructive ? '#dc2626' : theme.colors.primary} />
      )}
      <Text style={[styles.itemLabel, { color: destructive ? '#dc2626' : theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <ChevronRight size={18} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
}

function SectionTitle({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
      {title}
    </Text>
  );
}

export default function AppDrawerContent(props) {
  const { state, navigation } = props;
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { scrollToTop } = useScrollToTop();
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileService.getMyProfile(),
  });
  const profileAvatarUrl = profile?.avatar_url ?? profile?.avatarUrl;

  const navigateAndClose = (route) => {
    navigation.closeDrawer();
    router.push(route);
  };

  // When tapping a Main item (e.g. Dashboard) while already on that screen, scroll to top instead of navigating
  const handleMainItemPress = (route) => {
    if (MAIN_ITEMS.some((item) => item.route === route) && isCurrentlyOnRoute(state, route)) {
      scrollToTop(route);
      navigation.closeDrawer();
      return;
    }
    navigateAndClose(route);
  };

  const { startLogout } = useLogout();
  const { resetOnboarding } = useOnboarding();

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          startLogout();
          navigation.closeDrawer();
          await resetOnboarding(); // so next account gets onboarding
          await authService.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.heroWrap}>
        <LogoHero variant="drawer" />
      </View>

      <SectionTitle theme={theme} title={t('navigation.categories.main', 'Main')} />
      {MAIN_ITEMS.map(({ route, icon, labelKey }) => (
        <DrawerItemRow
          key={route}
          icon={icon}
          label={t(labelKey)}
          onPress={() => handleMainItemPress(route)}
          theme={theme}
          avatarUrl={route === '/(app)/(tabs)/profile' ? profileAvatarUrl : undefined}
        />
      ))}

      <SectionTitle theme={theme} title={t('navigation.categories.finance', 'Finance')} />
      {FINANCE_ITEMS.map(({ route, icon, labelKey }) => (
        <DrawerItemRow
          key={route}
          icon={icon}
          label={t(labelKey)}
          onPress={() => navigateAndClose(route)}
          theme={theme}
        />
      ))}

      <SectionTitle theme={theme} title={t('navigation.categories.tools', 'Tools')} />
      {TOOLS_ITEMS.map(({ route, icon, labelKey }) => (
        <DrawerItemRow
          key={route}
          icon={icon}
          label={t(labelKey)}
          onPress={() => navigateAndClose(route)}
          theme={theme}
        />
      ))}

      <SectionTitle theme={theme} title={t('navigation.categories.lifestyle', 'Lifestyle')} />
      {LIFESTYLE_ITEMS.map(({ route, icon, labelKey }) => (
        <DrawerItemRow
          key={route}
          icon={icon}
          label={t(labelKey)}
          onPress={() => navigateAndClose(route)}
          theme={theme}
        />
      ))}

      <View style={[styles.footer, { borderTopColor: theme.colors.glassBorder }]}>
        <DrawerItemRow
          icon={Moon}
          label={isDark ? t('theme.lightMode') : t('theme.darkMode')}
          onPress={() => {
            toggleTheme();
          }}
          theme={theme}
          accessibilityLabel={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
        />
        <DrawerItemRow
          icon={LogOut}
          label={t('auth.logout')}
          onPress={handleLogout}
          theme={theme}
          destructive
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  heroWrap: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  drawerAvatarWrap: {
    overflow: 'hidden',
  },
  drawerAvatar: {
    borderRadius: 9999,
  },
  itemLabel: {
    flex: 1,
    ...typography.body,
  },
  footer: {
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
