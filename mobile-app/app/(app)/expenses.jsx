/**
 * Expenses Screen (React Native)
 * Full CRUD functionality for expense transactions.
 * 
 * Features:
 * - List expenses with pull-to-refresh
 * - Search/filter expenses
 * - Create new expense via header Add button
 * - Edit expense on tap
 * - Delete expense with confirmation
 * - Theme-aware styling
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react-native';
import { transactionService } from '../../services/api';
import { impactMedium, impactLight, notificationSuccess, notificationWarning } from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  SearchInput,
  DateRangePicker,
  ConfirmationModal,
  TransactionForm,
  EmptyState,
  ScreenLoading,
  ScreenHeader,
  AddToCalculatorButton,
  useToast,
} from '../../components';

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
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

  // Refs to close swipeable rows (one row open at a time)
  const rowRefs = useRef({});

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
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      notificationSuccess();
      showToast(t('expenses.createSuccess', 'Expense added successfully'), 'success');
      setIsFormOpen(false);

      // Handle budget alerts
      const alerts = response?.budgetAlerts || [];
      if (alerts.length > 0) {
        alerts.forEach((alert) => {
          const categoryName = t(`categories.${alert.category}`, alert.category);
          if (alert.alertType === 'exceeded') {
            notificationWarning();
            showToast(
              t('budgets.alertExceeded', '{{category}} budget exceeded! {{percentage}}% used', {
                category: categoryName,
                percentage: alert.percentageUsed,
              }),
              'error'
            );
          } else if (alert.alertType === 'warning') {
            showToast(
              t('budgets.alertWarning', '{{category}} budget at {{percentage}}%', {
                category: categoryName,
                percentage: alert.percentageUsed,
              }),
              'warning'
            );
          }
        });
      }
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
      notificationSuccess();
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
      notificationWarning();
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

  // Close other rows when one opens
  const handleSwipeableWillOpen = useCallback((itemId) => {
    Object.keys(rowRefs.current).forEach((id) => {
      if (id !== String(itemId)) rowRefs.current[id]?.close();
    });
  }, []);

  // Swipe left action panel (edit)
  const renderLeftActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: theme.colors.primary }]}>
        <Pencil size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.edit', 'Edit')}</Text>
      </View>
    ),
    [theme.colors.primary, t]
  );

  // Swipe right action panel (delete)
  const renderRightActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: theme.colors.error }]}>
        <Trash2 size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.delete', 'Delete')}</Text>
      </View>
    ),
    [theme.colors.error, t]
  );

  // Render list item
  const renderItem = ({ item }) => (
    <Swipeable
      ref={(r) => { rowRefs.current[item.id] = r; }}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableLeftOpen={() => {
        impactLight();
        handleEdit(item);
        setTimeout(() => rowRefs.current[item.id]?.close(), 200);
      }}
      onSwipeableRightOpen={() => {
        impactLight();
        setDeleteTarget(item);
        setTimeout(() => rowRefs.current[item.id]?.close(), 200);
      }}
      onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
        onPress={() => handleEdit(item)}
        onLongPress={() => setDeleteTarget(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.description || item.category}, ${formatAmount(item.amount)}`}
        accessibilityHint={t('common.swipeHint', 'Swipe right to edit, left to delete')}
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
          <View style={styles.amountRow}>
            <Text style={[styles.cardAmount, { color: theme.colors.error }]}>
              -{formatAmount(item.amount)}
            </Text>
            <AddToCalculatorButton
              value={item.amount}
              isPrivate={isPrivate}
              size={16}
              onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
            />
          </View>
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
    </Swipeable>
  );

  // Loading indicator in form
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading on first fetch so we don't flash empty state
  if (isLoading && (data === undefined || data === null)) {
    return <ScreenLoading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('expenses.title', 'Expenses')}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => { impactMedium(); setIsFormOpen(true); }}
            style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel={t('expenses.addNew', 'Add new expense')}
            accessibilityRole="button"
          >
            <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />
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
          searchQuery ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.empty, { color: theme.colors.textLight }]}>
                {t('expenses.noResults', 'No expenses found')}
              </Text>
            </View>
          ) : (
            <EmptyState
              icon={Receipt}
              title={t('expenses.emptyTitle', 'No expenses yet')}
              description={t('expenses.emptyDescription', 'Start tracking your spending by adding your first expense.')}
              ctaLabel={t('expenses.addFirst', 'Add Expense')}
              onPress={() => setIsFormOpen(true)}
            />
          )
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
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.tabBarBottomClearance,
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  swipeActionRight: {
    marginLeft: spacing.sm,
  },
  swipeActionLeft: {
    marginRight: spacing.sm,
  },
  swipeActionText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
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
