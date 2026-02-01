/**
 * Admin Users – list users; lock/unlock, reset 2FA.
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
import { ChevronLeft, Search, Lock, Unlock, ShieldOff } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { SearchInput, useToast, ConfirmationModal } from '../../../components';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionUser, setActionUser] = useState(null);
  const [actionType, setActionType] = useState(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminService.getUsers(page, 20, search),
  });

  const lockMutation = useMutation({
    mutationFn: (userId) => adminService.lockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(t('admin.userLocked', 'User locked'), 'success');
      setActionUser(null);
      setActionType(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const unlockMutation = useMutation({
    mutationFn: (userId) => adminService.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(t('admin.userUnlocked', 'User unlocked'), 'success');
      setActionUser(null);
      setActionType(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const reset2faMutation = useMutation({
    mutationFn: (userId) => adminService.resetTwoFactor(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(t('admin.twoFactorReset', '2FA reset'), 'success');
      setActionUser(null);
      setActionType(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const users = data?.users ?? data?.items ?? (Array.isArray(data) ? data : []) ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleConfirmAction = () => {
    if (!actionUser || !actionType) return;
    if (actionType === 'lock') lockMutation.mutate(actionUser.id);
    else if (actionType === 'unlock') unlockMutation.mutate(actionUser.id);
    else if (actionType === 'reset2fa') reset2faMutation.mutate(actionUser.id);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
      <Text style={[styles.email, { color: theme.colors.text }]} numberOfLines={1}>
        {item.email || item.userName}
      </Text>
      <Text style={[styles.name, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {item.displayName || item.display_name || '—'}
      </Text>
      <View style={styles.actions}>
        {(item.isLockedOut ?? item.isLocked) ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.success + '20' }]}
            onPress={() => { setActionUser(item); setActionType('unlock'); }}
          >
            <Unlock size={16} color={theme.colors.success} />
            <Text style={[styles.actionText, { color: theme.colors.success }]}>{t('admin.unlock', 'Unlock')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.error + '20' }]}
            onPress={() => { setActionUser(item); setActionType('lock'); }}
          >
            <Lock size={16} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>{t('admin.lock', 'Lock')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => { setActionUser(item); setActionType('reset2fa'); }}
        >
          <ShieldOff size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>{t('admin.reset2fa', 'Reset 2FA')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('admin.users', 'User lookup')}</Text>
      </View>

      <View style={styles.filters}>
        <SearchInput
          initialValue={search}
          onSearch={setSearch}
          placeholder={t('admin.searchUsers', 'Search users...')}
          debounceMs={400}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id ?? item.userId ?? item.email ?? '')}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>{t('common.noData')}</Text>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={{ color: theme.colors.text }}>{t('common.previous')}</Text>
              </TouchableOpacity>
              <Text style={[styles.pageInfo, { color: theme.colors.textSecondary }]}>
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={{ color: theme.colors.text }}>{t('common.next')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <ConfirmationModal
        isOpen={!!actionUser && !!actionType}
        onClose={() => { setActionUser(null); setActionType(null); }}
        onConfirm={handleConfirmAction}
        title={
          actionType === 'lock'
            ? t('admin.lockUserConfirm', 'Lock user?')
            : actionType === 'unlock'
              ? t('admin.unlockUserConfirm', 'Unlock user?')
              : t('admin.reset2faConfirm', 'Reset 2FA for this user?')
        }
        message={actionUser?.email || ''}
        variant="danger"
        loading={lockMutation.isPending || unlockMutation.isPending || reset2faMutation.isPending}
      />
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
  filters: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  email: { ...typography.body, fontWeight: '600' },
  name: { ...typography.bodySmall, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  actionText: { ...typography.caption, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg },
  pageBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  pageInfo: { ...typography.bodySmall },
});
