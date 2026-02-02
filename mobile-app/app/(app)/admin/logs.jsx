/**
 * Admin Logs – system logs list.
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
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../../constants/theme';

export default function AdminLogsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: logs = [], refetch, isFetching } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => adminService.getLogs(50),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const list = Array.isArray(logs) ? logs : logs?.entries ?? [];

  const renderItem = ({ item }) => {
    const level = item.level || item.Level || '';
    const color = level === 'Error' ? theme.colors.error : level === 'Warning' ? theme.colors.warning : theme.colors.textSecondary;
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <Text style={[styles.level, { color }]}>{level}</Text>
        <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={3}>
          {item.message || item.messageTemplate || item.Message || '—'}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textLight }]}>
          {item.timestamp || item.Timestamp || item.time || '—'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('admin.logs', 'System logs')}</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>{t('common.noData')}</Text>
        }
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
  list: { padding: spacing.md, paddingBottom: spacing.lg },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  level: { ...typography.caption, fontWeight: '700', marginBottom: 4 },
  message: { ...typography.bodySmall },
  time: { ...typography.caption, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
});
