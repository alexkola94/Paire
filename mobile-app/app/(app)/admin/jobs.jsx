/**
 * Admin Jobs – background jobs list; trigger job.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Play } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../../constants/theme';
import { useToast, ConfirmationModal, ScreenHeader } from '../../../components';

export default function AdminJobsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [triggerJob, setTriggerJob] = useState(null);

  const { data: jobs = [], refetch, isFetching } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminService.getJobs(),
  });

  const triggerMutation = useMutation({
    mutationFn: (jobName) => adminService.triggerJob(jobName),
    onSuccess: (_, jobName) => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      showToast(t('admin.jobTriggered', 'Job triggered'), 'success');
      setTriggerJob(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const list = Array.isArray(jobs) ? jobs : jobs?.jobs ?? [];

  const renderItem = ({ item }) => {
    const name = item.name || item.jobName || item.id || item;
    const displayName = typeof name === 'string' ? name : JSON.stringify(name);
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <Text style={[styles.jobName, { color: theme.colors.text }]}>{displayName}</Text>
        <TouchableOpacity
          style={[styles.triggerBtn, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setTriggerJob(displayName)}
        >
          <Play size={16} color={theme.colors.primary} />
          <Text style={[styles.triggerText, { color: theme.colors.primary }]}>{t('admin.trigger', 'Trigger')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={t('admin.jobs', 'Background jobs')} onBack={() => router.back()} />
      <FlatList
        data={list}
        keyExtractor={(item, i) => String(item?.name ?? item?.id ?? i)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>{t('common.noData')}</Text>
        }
      />

      <ConfirmationModal
        isOpen={!!triggerJob}
        onClose={() => setTriggerJob(null)}
        onConfirm={() => triggerJob && triggerMutation.mutate(triggerJob)}
        title={t('admin.triggerJobConfirm', 'Trigger job?')}
        message={triggerJob || ''}
        variant="danger"
        loading={triggerMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  jobName: { flex: 1, ...typography.body, fontWeight: '500' },
  triggerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  triggerText: { ...typography.caption, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
});
