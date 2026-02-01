/**
 * Expenses Screen (React Native)
 * Full CRUD functionality for expense transactions.
 * 
 * Features:
 * - List expenses with pull-to-refresh
 * - Search/filter expenses
 * - Create new expense via FAB
 * - Edit expense on tap
 * - Delete expense with confirmation
 * - Theme-aware styling
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import { transactionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  SearchInput,
  DateRangePicker,
  ConfirmationModal,
  TransactionForm,
  useToast,
} from '../../components';

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const PAGE_SIZE = 20;

  // Fetch expenses (with date range and optional pagination)
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['expenses', startDate, endDate, page, PAGE_SIZE],
    queryFn: () =>
      transactionService.getAll({
        type: 'expense',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newTransaction) => transactionService.create(newTransaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('expenses.createSuccess', 'Expense added successfully'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('expenses.updateSuccess', 'Expense updated successfully'), 'success');
      setEditingTransaction(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('expenses.deleteSuccess', 'Expense deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Reset to first page when date range changes
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Normalize response: API returns either array or { items, totalCount, totalPages }
  const rawItems = Array.isArray(data) ? data : data?.items || [];
  const totalCount = Array.isArray(data) ? data?.length : data?.totalCount ?? rawItems.length;
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1);
  const isPaged = !Array.isArray(data) && data != null && 'totalCount' in data;

  // Get and filter items (client-side search on current page)
  const items = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    
    const query = searchQuery.toLowerCase();
    return rawItems.filter((item) =>
      item.description?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [rawItems, searchQuery]);

  // Handle form submission (create or update)
  const handleFormSubmit = async (formData) => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingTransaction(item);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
    }
  };

  // Close form modal
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  // Format currency display
  const formatAmount = (amount) => {
    if (isPrivate) return '••••';
    return `€${amount?.toFixed(2)}`;
  };

  // Render list item
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
      onPress={() => handleEdit(item)}
      onLongPress={() => setDeleteTarget(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${item.description || item.category}, ${formatAmount(item.amount)}`}
      accessibilityHint={t('common.tapToEdit', 'Tap to edit, hold to delete')}
    >
      <View style={styles.row}>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.description || item.category}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
            {t(`categories.${item.category}`, item.category)} • {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.cardAmount, { color: theme.colors.error }]}>
          -{formatAmount(item.amount)}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Pencil size={16} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.error}15` }]}
          onPress={() => setDeleteTarget(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Loading indicator in form
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('expenses.title', 'Expenses')}
        </Text>
      </View>

      {/* Filters: search + date range */}
      <View style={styles.searchContainer}>
        <SearchInput
          onSearch={setSearchQuery}
          placeholder={t('expenses.searchPlaceholder', 'Search expenses...')}
          initialValue={searchQuery}
        />
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          label={t('transactions.selectDateRange', 'Select date range')}
          showQuickPresets={true}
        />
      </View>

      {/* Expenses List */}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {searchQuery
                ? t('expenses.noResults', 'No expenses found')
                : t('expenses.empty', 'No expenses yet. Tap + to add one!')}
            </Text>
          </View>
        }
        ListFooterComponent={
          isPaged && totalPages > 1 ? (
            <View style={[styles.paginationRow, { borderTopColor: theme.colors.surfaceSecondary }]}>
              <TouchableOpacity
                style={[styles.paginationBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={[styles.paginationBtnText, { color: theme.colors.text }]}>
                  {t('common.previous', 'Previous')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.paginationInfo, { color: theme.colors.textSecondary }]}>
                {t('common.pageOf', { page, total: totalPages })}
              </Text>
              <TouchableOpacity
                style={[styles.paginationBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={[styles.paginationBtnText, { color: theme.colors.text }]}>
                  {t('common.next', 'Next')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }, shadows.lg]}
        onPress={() => setIsFormOpen(true)}
        activeOpacity={0.8}
        accessibilityLabel={t('expenses.addNew', 'Add new expense')}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen || editingTransaction !== null}
        onClose={closeForm}
        title={editingTransaction
          ? t('expenses.editTitle', 'Edit Expense')
          : t('expenses.addTitle', 'Add Expense')}
      >
        <TransactionForm
          transaction={editingTransaction}
          type="expense"
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          loading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('expenses.deleteTitle', 'Delete Expense')}
        message={t('expenses.deleteMessage', 'Are you sure you want to delete this expense? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardSub: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  cardAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  quickActionBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  empty: {
    textAlign: 'center',
    ...typography.body,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  paginationBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  paginationBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  paginationInfo: {
    ...typography.caption,
  },
});
