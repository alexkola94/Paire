/**
 * Budgets Screen (React Native)
 * Full CRUD functionality for budget management.
 * 
 * Features:
 * - List budgets with progress bars
 * - Pull-to-refresh
 * - Create new budget via FAB
 * - Edit budget on tap
 * - Delete budget with confirmation
 * - Theme-aware styling
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, PieChart } from 'lucide-react-native';
import { impactMedium, impactLight, notificationSuccess, notificationWarning } from '../../utils/haptics';
import { budgetService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  BudgetProgressBar,
  ConfirmationModal,
  BudgetForm,
  EmptyState,
  useToast,
} from '../../components';

// Currency formatter
const formatCurrency = (n) => (n != null ? `€${Number(n).toFixed(2)}` : '€0.00');

export default function BudgetsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rowRefs = useRef({});

  // Fetch budgets
  const { data, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetService.getAll(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newBudget) => budgetService.create(newBudget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      notificationSuccess();
      showToast(t('budgets.createSuccess', 'Budget created successfully'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => budgetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      notificationSuccess();
      showToast(t('budgets.updateSuccess', 'Budget updated successfully'), 'success');
      setEditingBudget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => budgetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      notificationWarning();
      showToast(t('budgets.deleteSuccess', 'Budget deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : [];

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    if (editingBudget) {
      await updateMutation.mutateAsync({ id: editingBudget.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingBudget(item);
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
    }
  };

  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBudget(null);
  };

  // Privacy-aware currency formatter
  const privateCurrencyFormatter = (n) => {
    if (isPrivate) return '••••';
    return formatCurrency(n);
  };

  // Close other rows when one opens
  const handleSwipeableWillOpen = useCallback((itemId) => {
    Object.keys(rowRefs.current).forEach((id) => {
      if (id !== String(itemId)) rowRefs.current[id]?.close();
    });
  }, []);

  const renderLeftActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: theme.colors.primary }]}>
        <Pencil size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.edit', 'Edit')}</Text>
      </View>
    ),
    [theme.colors.primary, t]
  );

  const renderRightActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: theme.colors.error }]}>
        <Trash2 size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.delete', 'Delete')}</Text>
      </View>
    ),
    [theme.colors.error, t]
  );

  // Render item
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
    >
      <BudgetProgressBar
        label={t(`categories.${item.category}`, item.category)}
        spent={item.spentAmount ?? 0}
        total={item.amount ?? 0}
        currencyFormatter={privateCurrencyFormatter}
      />
      
      {/* Period Badge */}
      <View style={[styles.periodBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <Text style={[styles.periodText, { color: theme.colors.textSecondary }]}>
          {t(`budgets.period.${item.period || 'monthly'}`, item.period || 'Monthly')}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <Pencil size={16} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.error}15` }]}
          onPress={() => setDeleteTarget(item)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Swipeable>
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('budgets.title', 'Budgets')}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
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
          <EmptyState
            icon={PieChart}
            title={t('budgets.emptyTitle', 'No budgets yet')}
            description={t('budgets.emptyDescription', 'Set a budget to track your spending and stay on target.')}
            ctaLabel={t('budgets.addFirst', 'Create Budget')}
            onPress={() => setIsFormOpen(true)}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }, shadows.lg]}
        onPress={() => { impactMedium(); setIsFormOpen(true); }}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen || editingBudget !== null}
        onClose={closeForm}
        title={editingBudget
          ? t('budgets.editTitle', 'Edit Budget')
          : t('budgets.addTitle', 'Add Budget')}
      >
        <BudgetForm
          budget={editingBudget}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          loading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('budgets.deleteTitle', 'Delete Budget')}
        message={t('budgets.deleteMessage', 'Are you sure you want to delete this budget?')}
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
  title: {
    ...typography.h2,
    padding: spacing.md,
    paddingBottom: spacing.sm,
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
  periodBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  periodText: {
    ...typography.caption,
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
});
