/**
 * Recurring Bills Screen (React Native)
 * Full CRUD functionality for recurring bill management.
 * 
 * Features:
 * - List recurring bills
 * - Pull-to-refresh
 * - Create new bill via FAB
 * - Edit bill on tap
 * - Delete bill with confirmation
 * - Mark as paid/unpaid
 * - Theme-aware styling
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CheckCircle, Circle, Calendar, Bell } from 'lucide-react-native';
import { recurringBillService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  ConfirmationModal,
  RecurringBillForm,
  useToast,
} from '../../components';

export default function RecurringBillsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch recurring bills
  const { data, refetch } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: () => recurringBillService.getAll(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newBill) => recurringBillService.create(newBill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      showToast(t('recurringBills.createSuccess', 'Bill created successfully'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => recurringBillService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      showToast(t('recurringBills.updateSuccess', 'Bill updated successfully'), 'success');
      setEditingBill(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => recurringBillService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      showToast(t('recurringBills.deleteSuccess', 'Bill deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Toggle paid status mutation
  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, isPaid }) => {
      // This would ideally call markPaid/unmarkPaid API
      // For now, we'll update the bill directly
      return recurringBillService.update(id, { isPaid: !isPaid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
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
    if (editingBill) {
      await updateMutation.mutateAsync({ id: editingBill.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingBill(item);
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
    }
  };

  // Handle toggle paid
  const handleTogglePaid = (item) => {
    togglePaidMutation.mutate({ id: item.id, isPaid: item.isPaid });
  };

  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBill(null);
  };

  // Format amount
  const formatAmount = (amount) => {
    if (isPrivate) return '••••';
    return `€${amount?.toFixed(2)}`;
  };

  // Get due status
  const getDueStatus = (bill) => {
    if (!bill.dueDay) return null;
    const today = new Date().getDate();
    const daysUntilDue = bill.dueDay - today;
    
    if (daysUntilDue < 0) return { label: t('recurringBills.overdue', 'Overdue'), color: theme.colors.error };
    if (daysUntilDue === 0) return { label: t('recurringBills.dueToday', 'Due today'), color: theme.colors.warning };
    if (daysUntilDue <= 3) return { label: t('recurringBills.dueSoon', 'Due soon'), color: theme.colors.warning };
    return null;
  };

  // Render item
  const renderItem = ({ item }) => {
    const dueStatus = getDueStatus(item);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
        onPress={() => handleEdit(item)}
        onLongPress={() => setDeleteTarget(item)}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          {/* Paid Toggle */}
          <TouchableOpacity
            style={styles.paidToggle}
            onPress={() => handleTogglePaid(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {item.isPaid ? (
              <CheckCircle size={24} color={theme.colors.success} />
            ) : (
              <Circle size={24} color={theme.colors.textLight} />
            )}
          </TouchableOpacity>

          {/* Bill Info */}
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.colors.text },
                item.isPaid && styles.cardTitlePaid,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                {t(`recurringBills.frequency.${item.frequency}`, item.frequency)}
                {' • '}
                {t(`categories.${item.category}`, item.category)}
              </Text>
            </View>
            {item.dueDay && (
              <View style={styles.dueRow}>
                <Calendar size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.dueDayText, { color: theme.colors.textSecondary }]}>
                  {t('recurringBills.dueDayLabel', 'Day')} {item.dueDay}
                </Text>
                {dueStatus && (
                  <View style={[styles.dueBadge, { backgroundColor: `${dueStatus.color}15` }]}>
                    <Text style={[styles.dueBadgeText, { color: dueStatus.color }]}>
                      {dueStatus.label}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={[styles.cardAmount, { color: theme.colors.primary }]}>
              {formatAmount(item.amount)}
            </Text>
            {item.autoPay && (
              <View style={[styles.autoPayBadge, { backgroundColor: `${theme.colors.success}15` }]}>
                <Text style={[styles.autoPayText, { color: theme.colors.success }]}>
                  {t('recurringBills.auto', 'Auto')}
                </Text>
              </View>
            )}
          </View>
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
    );
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('recurringBills.title', 'Recurring Bills')}
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
          <View style={styles.emptyContainer}>
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {t('recurringBills.empty', 'No recurring bills yet. Tap + to add one!')}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }, shadows.lg]}
        onPress={() => setIsFormOpen(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen || editingBill !== null}
        onClose={closeForm}
        title={editingBill
          ? t('recurringBills.editTitle', 'Edit Bill')
          : t('recurringBills.addTitle', 'Add Bill')}
      >
        <RecurringBillForm
          bill={editingBill}
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
        title={t('recurringBills.deleteTitle', 'Delete Bill')}
        message={t('recurringBills.deleteMessage', 'Are you sure you want to delete this recurring bill?')}
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
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidToggle: {
    marginRight: spacing.sm,
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardTitlePaid: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metaRow: {
    marginTop: 2,
  },
  cardSub: {
    ...typography.bodySmall,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  dueDayText: {
    ...typography.caption,
  },
  dueBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dueBadgeText: {
    ...typography.caption,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  autoPayBadge: {
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  autoPayText: {
    ...typography.caption,
    fontWeight: '500',
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
});
