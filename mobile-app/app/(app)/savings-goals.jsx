/**
 * Savings Goals Screen (React Native)
 * Full CRUD functionality for savings goal management.
 * 
 * Features:
 * - List savings goals with progress
 * - Pull-to-refresh
 * - Create new goal via FAB
 * - Edit goal on tap
 * - Delete goal with confirmation
 * - Quick deposit/withdraw actions
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
import { Plus, Pencil, Trash2, PlusCircle, MinusCircle } from 'lucide-react-native';
import { savingsGoalService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  SavingGoalProgressBar,
  ConfirmationModal,
  SavingsGoalForm,
  CurrencyInput,
  Button,
  useToast,
} from '../../components';

export default function SavingsGoalsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [depositTarget, setDepositTarget] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [actionAmount, setActionAmount] = useState('');

  // Fetch savings goals
  const { data, refetch } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => savingsGoalService.getAll(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newGoal) => savingsGoalService.create(newGoal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      showToast(t('savingsGoals.createSuccess', 'Goal created successfully'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => savingsGoalService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      showToast(t('savingsGoals.updateSuccess', 'Goal updated successfully'), 'success');
      setEditingGoal(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => savingsGoalService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      showToast(t('savingsGoals.deleteSuccess', 'Goal deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Deposit mutation (update current amount)
  const depositMutation = useMutation({
    mutationFn: async ({ id, amount }) => {
      const goal = items.find(g => g.id === id);
      const newAmount = (goal?.currentAmount || 0) + amount;
      return savingsGoalService.update(id, { currentAmount: newAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      showToast(t('savingsGoals.depositSuccess', 'Deposit successful'), 'success');
      setDepositTarget(null);
      setActionAmount('');
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ id, amount }) => {
      const goal = items.find(g => g.id === id);
      const newAmount = Math.max(0, (goal?.currentAmount || 0) - amount);
      return savingsGoalService.update(id, { currentAmount: newAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      showToast(t('savingsGoals.withdrawSuccess', 'Withdrawal successful'), 'success');
      setWithdrawTarget(null);
      setActionAmount('');
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
    if (editingGoal) {
      await updateMutation.mutateAsync({ id: editingGoal.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingGoal(item);
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
    }
  };

  // Handle deposit
  const handleDepositConfirm = async () => {
    const amount = parseFloat(actionAmount);
    if (depositTarget && amount > 0) {
      await depositMutation.mutateAsync({ id: depositTarget.id, amount });
    }
  };

  // Handle withdraw
  const handleWithdrawConfirm = async () => {
    const amount = parseFloat(actionAmount);
    if (withdrawTarget && amount > 0) {
      await withdrawMutation.mutateAsync({ id: withdrawTarget.id, amount });
    }
  };

  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  // Format amount
  const formatCurrency = (n) => {
    if (isPrivate) return '••••';
    return `€${n?.toFixed(2)}`;
  };

  // Render item
  const renderItem = ({ item }) => {
    const pct = item.targetAmount > 0 
      ? Math.min((item.currentAmount / item.targetAmount) * 100, 100) 
      : 0;
    const goalColor = item.color || theme.colors.primary;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
        onPress={() => handleEdit(item)}
        onLongPress={() => setDeleteTarget(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${goalColor}20` }]}>
            <Text style={styles.iconEmoji}>{item.icon || '🎯'}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.targetDate && (
              <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                {t('savingsGoals.dueBy', 'Due')}: {new Date(item.targetDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <SavingGoalProgressBar
          currentAmount={item.currentAmount ?? 0}
          targetAmount={item.targetAmount ?? 0}
          currencyFormatter={formatCurrency}
          color={goalColor}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.success}15` }]}
            onPress={() => {
              setDepositTarget(item);
              setActionAmount('');
            }}
            activeOpacity={0.7}
          >
            <PlusCircle size={16} color={theme.colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.warning}15` }]}
            onPress={() => {
              setWithdrawTarget(item);
              setActionAmount('');
            }}
            activeOpacity={0.7}
          >
            <MinusCircle size={16} color={theme.colors.warning} />
          </TouchableOpacity>
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
        {t('savingsGoals.title', 'Savings Goals')}
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
              {t('savingsGoals.empty', 'No savings goals yet. Tap + to create one!')}
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
        isOpen={isFormOpen || editingGoal !== null}
        onClose={closeForm}
        title={editingGoal
          ? t('savingsGoals.editTitle', 'Edit Goal')
          : t('savingsGoals.addTitle', 'Add Goal')}
      >
        <SavingsGoalForm
          goal={editingGoal}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          loading={isSubmitting}
        />
      </Modal>

      {/* Deposit Modal */}
      <Modal
        isOpen={depositTarget !== null}
        onClose={() => {
          setDepositTarget(null);
          setActionAmount('');
        }}
        title={t('savingsGoals.deposit', 'Add Deposit')}
      >
        <View style={styles.actionModalContent}>
          <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
            {t('savingsGoals.depositTo', 'Deposit to')}: {depositTarget?.name}
          </Text>
          <CurrencyInput
            value={actionAmount}
            onChange={setActionAmount}
            label={t('savingsGoals.amount', 'Amount')}
            quickAmounts={[50, 100, 200, 500]}
          />
          <View style={styles.actionButtons}>
            <Button
              title={t('common.cancel', 'Cancel')}
              variant="secondary"
              onPress={() => {
                setDepositTarget(null);
                setActionAmount('');
              }}
              style={styles.actionBtn}
            />
            <Button
              title={t('savingsGoals.deposit', 'Deposit')}
              variant="primary"
              onPress={handleDepositConfirm}
              loading={depositMutation.isPending}
              disabled={!actionAmount || parseFloat(actionAmount) <= 0}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        isOpen={withdrawTarget !== null}
        onClose={() => {
          setWithdrawTarget(null);
          setActionAmount('');
        }}
        title={t('savingsGoals.withdraw', 'Withdraw')}
      >
        <View style={styles.actionModalContent}>
          <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
            {t('savingsGoals.withdrawFrom', 'Withdraw from')}: {withdrawTarget?.name}
          </Text>
          <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]}>
            {t('savingsGoals.available', 'Available')}: {formatCurrency(withdrawTarget?.currentAmount)}
          </Text>
          <CurrencyInput
            value={actionAmount}
            onChange={setActionAmount}
            label={t('savingsGoals.amount', 'Amount')}
            quickAmounts={[50, 100, 200, 500]}
          />
          <View style={styles.actionButtons}>
            <Button
              title={t('common.cancel', 'Cancel')}
              variant="secondary"
              onPress={() => {
                setWithdrawTarget(null);
                setActionAmount('');
              }}
              style={styles.actionBtn}
            />
            <Button
              title={t('savingsGoals.withdraw', 'Withdraw')}
              variant="primary"
              onPress={handleWithdrawConfirm}
              loading={withdrawMutation.isPending}
              disabled={!actionAmount || parseFloat(actionAmount) <= 0}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('savingsGoals.deleteTitle', 'Delete Goal')}
        message={t('savingsGoals.deleteMessage', 'Are you sure you want to delete this savings goal?')}
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardSub: {
    ...typography.bodySmall,
    marginTop: 2,
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
  actionModalContent: {
    padding: spacing.md,
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  actionSub: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
