import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  User, LogOut, Users, Bell, Trophy, Shield, Moon, Globe,
  ChevronRight, CreditCard, PiggyBank, Receipt, ShoppingCart, MapPin,
} from 'lucide-react-native';
import { profileService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

function MenuItem({ icon: Icon, label, onPress, theme, destructive }) {
  return (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]} onPress={onPress}>
      <Icon size={20} color={destructive ? '#dc2626' : theme.colors.primary} />
      <Text style={[styles.menuLabel, { color: destructive ? '#dc2626' : theme.colors.text }]}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const user = authService.getCurrentUser();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileService.getMyProfile(),
  });

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await authService.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Info */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }, shadows.md]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <User size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {profile?.displayName || user?.displayName || user?.email?.split('@')[0]}
          </Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t('profile.settings')}</Text>
        <View style={[styles.menuGroup, shadows.sm]}>
          <MenuItem icon={Moon} label={isDark ? t('theme.lightMode') : t('theme.darkMode')} onPress={() => toggleTheme()} theme={theme} />
          <MenuItem icon={Globe} label={t('settings.language')} onPress={() => {}} theme={theme} />
          <MenuItem icon={Shield} label={t('auth.twoFactorSetup')} onPress={() => router.push('/(auth)/setup-2fa')} theme={theme} />
        </View>

        {/* Navigation */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t('profile.manage')}</Text>
        <View style={[styles.menuGroup, shadows.sm]}>
          <MenuItem icon={MapPin} label={t('travel.common.enterTravelMode', 'Travel Mode')} onPress={() => router.push('/(app)/travel')} theme={theme} />
          <MenuItem icon={Users} label={t('navigation.partnership')} onPress={() => router.push('/(app)/partnership')} theme={theme} />
          <MenuItem icon={PiggyBank} label={t('navigation.savingsGoals')} onPress={() => router.push('/(app)/savings-goals')} theme={theme} />
          <MenuItem icon={CreditCard} label={t('navigation.loans')} onPress={() => router.push('/(app)/loans')} theme={theme} />
          <MenuItem icon={Receipt} label={t('navigation.recurringBills')} onPress={() => router.push('/(app)/recurring-bills')} theme={theme} />
          <MenuItem icon={ShoppingCart} label={t('navigation.shoppingLists')} onPress={() => router.push('/(app)/shopping-lists')} theme={theme} />
          <MenuItem icon={Bell} label={t('navigation.reminders')} onPress={() => router.push('/(app)/reminders')} theme={theme} />
          <MenuItem icon={Trophy} label={t('navigation.achievements')} onPress={() => router.push('/(app)/achievements')} theme={theme} />
        </View>

        {/* Logout */}
        <View style={[styles.menuGroup, shadows.sm, { marginTop: spacing.lg }]}>
          <MenuItem icon={LogOut} label={t('auth.logout')} onPress={handleLogout} theme={theme} destructive />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  profileCard: {
    borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  name: { ...typography.h2 },
  email: { ...typography.bodySmall, marginTop: spacing.xs },
  sectionTitle: { ...typography.label, marginBottom: spacing.sm, marginLeft: spacing.xs },
  menuGroup: { borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.lg },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    gap: spacing.md, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuLabel: { flex: 1, ...typography.body },
});
