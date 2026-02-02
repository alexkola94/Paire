/**
 * Admin Dashboard – overview stats and links to Users, Logs, Jobs, Monitoring.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Users, FileText, Cpu, Activity, ChevronRight } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';

function StatCard({ icon: Icon, label, value, theme, styles }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
      <Icon size={24} color={theme.colors.primary} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function NavRow({ icon: Icon, title, onPress, theme, styles }) {
  return (
    <TouchableOpacity
      style={[styles.navRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={22} color={theme.colors.primary} />
      <Text style={[styles.navTitle, { color: theme.colors.text }]}>{title}</Text>
      <ChevronRight size={20} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const totalUsers = stats?.totalUsers ?? 0;
  const totalTransactions = stats?.totalTransactions ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('admin.dashboard', 'Admin')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {isLoading && !stats ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error?.message || t('common.error')}
          </Text>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('admin.overview', 'Overview')}
            </Text>
            <StatCard
              icon={Users}
              label={t('admin.totalUsers', 'Total users')}
              value={String(totalUsers)}
              theme={theme}
              styles={styles}
            />
            <StatCard
              icon={Activity}
              label={t('admin.totalTransactions', 'Total transactions')}
              value={String(totalTransactions)}
              theme={theme}
              styles={styles}
            />

            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('admin.sections', 'Sections')}
            </Text>
            <NavRow
              icon={Users}
              title={t('admin.users', 'User lookup')}
              onPress={() => router.push('/(app)/admin/users')}
              theme={theme}
              styles={styles}
            />
            <NavRow
              icon={FileText}
              title={t('admin.logs', 'System logs')}
              onPress={() => router.push('/(app)/admin/logs')}
              theme={theme}
              styles={styles}
            />
            <NavRow
              icon={Cpu}
              title={t('admin.jobs', 'Background jobs')}
              onPress={() => router.push('/(app)/admin/jobs')}
              theme={theme}
              styles={styles}
            />
            <NavRow
              icon={Activity}
              title={t('admin.monitoring', 'Monitoring')}
              onPress={() => router.push('/(app)/admin/monitoring')}
              theme={theme}
              styles={styles}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { flex: 1, ...typography.h3 },
  scroll: { padding: spacing.md, paddingBottom: spacing.lg },
  centered: { padding: spacing.xl },
  errorText: { ...typography.body, textAlign: 'center', marginTop: spacing.lg },
  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  statLabel: { ...typography.caption },
  statValue: { ...typography.h3 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  navTitle: { flex: 1, ...typography.body, fontWeight: '600' },
});
