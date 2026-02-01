/**
 * Transactions Screen (React Native)
 * Full CRUD: list with search, date range, pagination; add/edit/delete; detail modal.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react-native';
import { transactionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  SearchInput,
  ConfirmationModal,
  TransactionForm,
  useToast,
} from '../../components';

const PAGE_SIZE = 20;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = dateStr.split('T')[0];
    return new Date(d).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['transactions', 'all', page, searchQuery, startDate, endDate],
    queryFn: () =>
      transactionService.getAll({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => transactionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.createSuccess', 'Transaction added'), 'success');
      setFormOpen(false);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => transactionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.updateSuccess', 'Transaction updated'), 'success');
      setEditingTransaction(null);
      setDetailTransaction(null);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.deleteSuccess', 'Transaction deleted'), 'success');
      setDeleteTarget(null);
      setDetailTransaction(null);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : data?.items || [];
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1);
  const totalCount = Array.isArray(data) ? data.length : (data?.totalCount ?? items.length);

  const openEdit = (item) => {
    setDetailTransaction(null);
    setEditingTransaction(item);
  };

  const openDetail = (item) => {
    setEditingTransaction(null);
    setDetailTransaction(item);
  };

  const handleSubmit = (payload) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item }) => {
    const isExpense = item.type === 'expense';
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
        onPress={() => openDetail(item)}
        onLongPress={() => setDeleteTarget(item)}
        activeOpacity={0.8}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.description || item.category || '—'}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {item.category} • {formatDate(item.date)}
            </Text>
          </View>
          <Text style={[styles.cardAmount, { color: isExpense ? '#dc2626' : '#16a34a' }]}>
            {isExpense ? '-' : '+'}€{Number(item.amount || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('transactions.title')}</Text>

      {/* Filters */}
      <View style={[styles.filters, { backgroundColor: theme.colors.background }]}>
        <SearchInput
          initialValue={searchQuery}
          onSearch={setSearchQuery}
          placeholder={t('transactions.searchPlaceholder', 'Search transactions...')}
          debounceMs={400}
        />
        <View style={styles.dateRow}>
          <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
            {t('transactions.startDate', 'From')}
          </Text>
          <TextInput
            style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textLight}
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>
            {t('transactions.endDate', 'To')}
          </Text>
          <TextInput
            style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textLight}
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>
            {t('common.noData')}
          </Text>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={{ color: theme.colors.text }}>{t('common.previous', 'Previous')}</Text>
              </TouchableOpacity>
              <Text style={[styles.pageInfo, { color: theme.colors.textSecondary }]}>
                {t('transactions.pageInfo', 'Page {{page}} of {{total}}', {
                  page,
                  total: totalPages,
                })}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={{ color: theme.colors.text }}>{t('common.next', 'Next')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* FAB Add */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => { setEditingTransaction(null); setFormOpen(true); }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={formOpen || !!editingTransaction}
        onClose={() => { setFormOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? t('transactions.edit', 'Edit Transaction') : t('transactions.add', 'Add Transaction')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <TransactionForm
            transaction={editingTransaction}
            type={editingTransaction?.type || 'expense'}
            onSubmit={handleSubmit}
            onCancel={() => { setFormOpen(false); setEditingTransaction(null); }}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailTransaction}
        onClose={() => setDetailTransaction(null)}
        title={t('transactions.detail', 'Transaction')}
      >
        {detailTransaction && (
          <View style={styles.detail}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.amount', 'Amount')}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      detailTransaction.type === 'expense' ? '#dc2626' : '#16a34a',
                  },
                ]}
              >
                {detailTransaction.type === 'expense' ? '-' : '+'}€
                {Number(detailTransaction.amount || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.category', 'Category')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {detailTransaction.category || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.description', 'Description')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {detailTransaction.description || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.date', 'Date')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {formatDate(detailTransaction.date)}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => openEdit(detailTransaction)}
              >
                <Pencil size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{t('common.edit', 'Edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                onPress={() => {
                  setDetailTransaction(null);
                  setDeleteTarget(detailTransaction);
                }}
              >
                <Trash2 size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{t('common.delete', 'Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('transactions.deleteConfirmTitle', 'Delete transaction?')}
        message={t('transactions.deleteConfirmMessage', 'This cannot be undone.')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { ...typography.h2, padding: spacing.md, paddingBottom: spacing.sm },
  filters: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dateLabel: { ...typography.caption },
  dateInput: {
    ...typography.bodySmall,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 110,
  },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardSub: { ...typography.bodySmall, marginTop: 2 },
  cardAmount: { ...typography.body, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  pageBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pageInfo: { ...typography.bodySmall },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  detail: { padding: spacing.md },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.body },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionBtnText: { ...typography.label, color: '#fff' },
});
