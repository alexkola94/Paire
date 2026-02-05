/**
 * Loans Screen (React Native)
 * Full CRUD functionality for loan management.
 * 
 * Features:
 * - List loans with type indicators
 * - Pull-to-refresh
 * - Create new loan via header Add button
 * - Edit loan on tap
 * - Delete loan with confirmation
 * - Theme-aware styling
 */

import { useState, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownLeft, List, HandCoins } from 'lucide-react-native';
import { impactMedium, impactLight, notificationSuccess, notificationWarning } from '../../utils/haptics';
import { loanService, loanPaymentService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  ConfirmationModal,
  LoanForm,
  Button,
  CurrencyInput,
  DateInput,
  FormField,
  EmptyState,
  ScreenLoading,
  ScreenHeader,
  useToast,
} from '../../components';

export default function LoansScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Payment history modal and form
  const [paymentsModalLoan, setPaymentsModalLoan] = useState(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    principalAmount: '',
    interestAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const rowRefs = useRef({});

  // Fetch loans
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loanService.getAll(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newLoan) => loanService.create(newLoan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      notificationSuccess();
      showToast(t('loans.createSuccess'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => loanService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      notificationSuccess();
      showToast(t('loans.updateSuccess'), 'success');
      setEditingLoan(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => loanService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      notificationWarning();
      showToast(t('loans.deleteSuccess'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Payments for selected loan
  const loanIdForPayments = paymentsModalLoan?.id;
  const { data: paymentsList = [] } = useQuery({
    queryKey: ['loan-payments', loanIdForPayments],
    queryFn: () => loanPaymentService.getByLoan(loanIdForPayments),
    enabled: !!loanIdForPayments,
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data) => loanPaymentService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      notificationSuccess();
      showToast(t('loans.paymentAdded'), 'success');
      setPaymentFormOpen(false);
      setPaymentFormData({
        amount: '',
        principalAmount: '',
        interestAmount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
    onError: (error) => {
      showToast(error.message || t('loans.paymentError'), 'error');
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId) => loanPaymentService.delete(paymentId),
    onSuccess: (_, paymentId) => {
      const loanId = deletePaymentTarget?.loanId;
      if (loanId) {
        queryClient.invalidateQueries({ queryKey: ['loan-payments', loanId] });
        queryClient.invalidateQueries({ queryKey: ['loans'] });
      }
      notificationWarning();
      showToast(t('loans.paymentDeleted'), 'success');
      setDeletePaymentTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('loans.paymentError'), 'error');
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
    if (editingLoan) {
      await updateMutation.mutateAsync({ id: editingLoan.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingLoan(item);
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
    setEditingLoan(null);
  };

  // Close payments modal and reset form
  const closePaymentsModal = () => {
    setPaymentsModalLoan(null);
    setPaymentFormOpen(false);
    setDeletePaymentTarget(null);
    setPaymentFormData({
      amount: '',
      principalAmount: '',
      interestAmount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Submit add payment form
  const handleAddPaymentSubmit = () => {
    const amount = typeof paymentFormData.amount === 'number' ? paymentFormData.amount : parseFloat(paymentFormData.amount);
    if (!paymentsModalLoan?.id || !paymentFormData.paymentDate) {
      showToast(t('validation.required', { field: t('loans.paymentDate', 'Payment Date') }), 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast(t('loans.amountRequired', 'Please enter a valid amount'), 'error');
      return;
    }
    const principalAmount = typeof paymentFormData.principalAmount === 'number' ? paymentFormData.principalAmount : parseFloat(paymentFormData.principalAmount || paymentFormData.amount) || amount;
    const interestAmount = typeof paymentFormData.interestAmount === 'number' ? paymentFormData.interestAmount : parseFloat(paymentFormData.interestAmount || 0) || 0;
    createPaymentMutation.mutate({
      loanId: paymentsModalLoan.id,
      amount,
      principalAmount,
      interestAmount,
      paymentDate: paymentFormData.paymentDate,
      notes: paymentFormData.notes || undefined,
    });
  };

  // Confirm delete payment
  const handleDeletePaymentConfirm = () => {
    if (deletePaymentTarget?.paymentId) {
      deletePaymentMutation.mutate(deletePaymentTarget.paymentId);
    }
  };

  // Format amount
  const formatAmount = (amount) => {
    if (isPrivate) return '••••';
    return `€${amount?.toFixed(2)}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return theme.colors.success;
      case 'overdue': return theme.colors.error;
      default: return theme.colors.primary;
    }
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
  const renderItem = ({ item }) => {
    const isGiven = item.type === 'given';
    const name = item.name || item.borrowerName || item.lenderName;
    const statusColor = getStatusColor(item.status);

    return (
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
        <View style={styles.row}>
          {/* Type Icon */}
          <View style={[styles.typeIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
            {isGiven ? (
              <ArrowUpRight size={20} color={theme.colors.success} />
            ) : (
              <ArrowDownLeft size={20} color={theme.colors.error} />
            )}
          </View>

          {/* Info */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {isGiven ? t('loans.given', 'Lent') : t('loans.received', 'Borrowed')}
              {item.interestRate > 0 && ` • ${item.interestRate}%`}
              {item.dueDate && ` • Due ${new Date(item.dueDate).toLocaleDateString()}`}
            </Text>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={[styles.cardAmount, { color: isGiven ? theme.colors.success : theme.colors.error }]}>
              {formatAmount(item.totalAmount || item.amount)}
            </Text>
            {item.remainingAmount != null && item.remainingAmount !== item.totalAmount && (
              <Text style={[styles.remainingAmount, { color: theme.colors.textSecondary }]}>
                {t('loans.remaining', 'Left')}: {formatAmount(item.remainingAmount)}
              </Text>
            )}
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`loans.status.${item.status || 'active'}`, item.status || 'Active')}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
            onPress={() => { setPaymentsModalLoan(item); setPaymentFormOpen(false); }}
            activeOpacity={0.7}
          >
            <List size={16} color={theme.colors.primary} />
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
      </Swipeable>
    );
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading on first fetch so we don't flash empty state (after all hooks to satisfy Rules of Hooks)
  if (isLoading && (data === undefined || data === null)) {
    return <ScreenLoading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('loans.title')}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => { impactMedium(); setIsFormOpen(true); }}
            style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel={t('loans.addNew')}
            accessibilityRole="button"
          >
            <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />
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
            icon={HandCoins}
            title={t('loans.emptyTitle')}
            description={t('loans.emptyDescription')}
            ctaLabel={t('loans.addFirst')}
            onPress={() => setIsFormOpen(true)}
          />
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormOpen || editingLoan !== null}
        onClose={closeForm}
        title={editingLoan ? t('loans.editTitle') : t('loans.addTitle')}
      >
        <LoanForm
          loan={editingLoan}
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
        title={t('loans.deleteTitle')}
        message={t('loans.deleteMessage')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Payment History Modal */}
      <Modal
        isOpen={paymentsModalLoan !== null}
        onClose={closePaymentsModal}
        title={`${paymentsModalLoan?.name || paymentsModalLoan?.borrowerName || paymentsModalLoan?.lenderName || t('loans.title')} – ${t('loans.paymentHistory')}`}
      >
        <View style={styles.paymentsModalContent}>
          {/* Payments list */}
          <View style={styles.paymentsListHeader}>
            <Text style={[styles.paymentsListTitle, { color: theme.colors.text }]}>
              {t('loans.paymentHistory', 'Payment History')}
            </Text>
            <TouchableOpacity
              style={[styles.addPaymentBtn, { backgroundColor: `${theme.colors.primary}15` }]}
              onPress={() => setPaymentFormOpen((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.addPaymentBtnText, { color: theme.colors.primary }]}>
                {paymentFormOpen ? t('common.cancel', 'Cancel') : t('loans.addPayment', 'Add Payment')}
              </Text>
            </TouchableOpacity>
          </View>

          {paymentFormOpen && (
            <View style={[styles.paymentFormBox, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.surfaceSecondary }]}>
              <CurrencyInput
                label={t('loans.paymentAmount', 'Payment Amount')}
                value={paymentFormData.amount}
                onChange={(v) => setPaymentFormData((p) => ({ ...p, amount: v }))}
                quickAmounts={[10, 50, 100]}
              />
              <View style={styles.paymentFormRow}>
                <View style={styles.paymentFormHalf}>
                  <CurrencyInput
                    label={t('loans.principalAmount', 'Principal Amount')}
                    value={paymentFormData.principalAmount}
                    onChange={(v) => setPaymentFormData((p) => ({ ...p, principalAmount: v }))}
                    quickAmounts={[]}
                  />
                </View>
                <View style={styles.paymentFormHalf}>
                  <CurrencyInput
                    label={t('loans.interestAmount', 'Interest Amount')}
                    value={paymentFormData.interestAmount}
                    onChange={(v) => setPaymentFormData((p) => ({ ...p, interestAmount: v }))}
                    quickAmounts={[]}
                  />
                </View>
              </View>
              <DateInput
                label={t('loans.paymentDate', 'Payment Date')}
                value={paymentFormData.paymentDate}
                onChange={(v) => setPaymentFormData((p) => ({ ...p, paymentDate: v }))}
              />
              <FormField
                label={t('loans.paymentNotes', 'Payment Notes')}
                value={paymentFormData.notes}
                onChangeText={(v) => setPaymentFormData((p) => ({ ...p, notes: v }))}
                placeholder={t('loans.paymentNotesPlaceholder', 'Optional payment notes...')}
              />
              <Button
                title={t('common.save', 'Save')}
                onPress={handleAddPaymentSubmit}
                loading={createPaymentMutation.isPending}
              />
            </View>
          )}

          {Array.isArray(paymentsList) && paymentsList.length === 0 && !paymentFormOpen && (
            <Text style={[styles.noPayments, { color: theme.colors.textLight }]}>
              {t('loans.noPayments', 'No payments recorded yet')}
            </Text>
          )}
          {Array.isArray(paymentsList) && paymentsList.length > 0 && (
            <FlatList
              data={paymentsList}
              keyExtractor={(p) => String(p.id)}
              scrollEnabled={true}
              style={styles.paymentsFlatList}
              renderItem={({ item: payment }) => {
                const payDate = payment.paymentDate || payment.payment_date;
                const payAmount = payment.amount;
                const principal = payment.principalAmount ?? payment.principal_amount;
                const interest = payment.interestAmount ?? payment.interest_amount;
                return (
                  <View key={payment.id} style={[styles.paymentRow, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.surfaceSecondary }]}>
                    <View style={styles.paymentRowLeft}>
                      <Text style={[styles.paymentRowAmount, { color: theme.colors.text }]}>
                        {formatAmount(payAmount)}
                      </Text>
                      <Text style={[styles.paymentRowDate, { color: theme.colors.textSecondary }]}>
                        {payDate ? new Date(payDate).toLocaleDateString() : '–'}
                      </Text>
                      {(principal != null || interest != null) && (
                        <Text style={[styles.paymentRowDetail, { color: theme.colors.textLight }]}>
                          {principal != null && `${t('loans.principalAmount', 'Principal')}: ${formatAmount(principal)}`}
                          {principal != null && interest != null && ' · '}
                          {interest != null && `${t('loans.interestAmount', 'Interest')}: ${formatAmount(interest)}`}
                        </Text>
                      )}
                      {payment.notes && (
                        <Text style={[styles.paymentRowNotes, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                          {payment.notes}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.paymentDeleteBtn, { backgroundColor: `${theme.colors.error}15` }]}
                      onPress={() => setDeletePaymentTarget({ paymentId: payment.id, loanId: paymentsModalLoan?.id })}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* Delete Payment Confirmation */}
      <ConfirmationModal
        isOpen={deletePaymentTarget !== null}
        onClose={() => setDeletePaymentTarget(null)}
        onConfirm={handleDeletePaymentConfirm}
        title={t('loans.deletePayment', 'Delete Payment')}
        message={t('loans.confirmDeletePayment', 'Are you sure you want to delete this payment?')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deletePaymentMutation.isPending}
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
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.tabBarBottomClearance,
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
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardSub: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  remainingAmount: {
    ...typography.caption,
    marginTop: 2,
  },
  statusRow: {
    marginTop: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
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
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
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
  // Payment history modal
  paymentsModalContent: {
    gap: spacing.md,
  },
  paymentsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentsListTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  addPaymentBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addPaymentBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  paymentFormBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  paymentFormRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentFormHalf: {
    flex: 1,
  },
  noPayments: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  paymentsFlatList: {
    maxHeight: 280,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  paymentRowLeft: {
    flex: 1,
  },
  paymentRowAmount: {
    ...typography.body,
    fontWeight: '600',
  },
  paymentRowDate: {
    ...typography.caption,
    marginTop: 2,
  },
  paymentRowDetail: {
    ...typography.caption,
    marginTop: 2,
  },
  paymentRowNotes: {
    ...typography.caption,
    marginTop: 2,
    fontStyle: 'italic',
  },
  paymentDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
