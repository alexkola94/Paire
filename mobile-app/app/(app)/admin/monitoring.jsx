/**
 * Admin Monitoring – metrics, database health, active sessions.
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
import { ChevronLeft, Activity, Database, Users } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../../constants/theme';

export default function AdminMonitoringScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: metrics, refetch: refetchMetrics, isFetching: loadingMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminService.getPerformanceMetrics(),
  });

  const { data: dbHealth, refetch: refetchDb, isFetching: loadingDb } = useQuery({
    queryKey: ['admin-db'],
    queryFn: () => adminService.getDatabaseHealth(),
  });

  const { data: sessions, refetch: refetchSessions, isFetching: loadingSessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => adminService.getActiveSessions(),
  });

  const refetch = useCallback(async () => {
    await Promise.all([refetchMetrics(), refetchDb(), refetchSessions()]);
  }, [refetchMetrics, refetchDb, refetchSessions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isLoading = loadingMetrics || loadingDb || loadingSessions;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('admin.monitoring', 'Monitoring')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Activity size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>{t('admin.metrics', 'Performance metrics')}</Text>
          <Text style={[styles.cardValue, { color: theme.colors.text }]}>
            {metrics != null ? JSON.stringify(metrics, null, 2) : (loadingMetrics ? t('common.loading') : '—')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Database size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>{t('admin.databaseHealth', 'Database health')}</Text>
          <Text style={[styles.cardValue, { color: theme.colors.text }]}>
            {dbHealth != null ? JSON.stringify(dbHealth, null, 2) : (loadingDb ? t('common.loading') : '—')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Users size={22} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.textSecondary }]}>{t('admin.activeSessions', 'Active sessions')}</Text>
          <Text style={[styles.cardValue, { color: theme.colors.text }]}>
            {sessions != null ? (Array.isArray(sessions) ? sessions.length : JSON.stringify(sessions, null, 2)) : (loadingSessions ? t('common.loading') : '—')}
          </Text>
        </View>
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
  scroll: { padding: spacing.md, paddingBottom: 100 },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  cardTitle: { ...typography.label, marginTop: spacing.xs },
  cardValue: { ...typography.bodySmall, marginTop: spacing.sm },
});
