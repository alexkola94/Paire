/**
 * Recurring Bills Screen (React Native)
 * Parity with desktop: sectioned list (Overdue, Due This Month, Paid This Month, Future),
 * summary cards, search, mark/unmark with loan/savings integration, swipe right = mark paid, swipe left = delete.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  TextInput,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  startOfDay,
  endOfMonth,
  addMonths,
  addWeeks,
  addYears,
  isBefore,
  isAfter,
  isSameMonth,
} from 'date-fns';
import { Plus, Pencil, Trash2, CheckCircle, Circle, Calendar, Paperclip, ExternalLink, Search, RotateCcw, CalendarClock } from 'lucide-react-native';
import {
  recurringBillService,
  loanPaymentService,
  savingsGoalService,
} from '../../services/api';
import { impactMedium, impactLight, notificationSuccess, notificationWarning } from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  Button,
  ConfirmationModal,
  RecurringBillForm,
  EmptyState,
  ScreenLoading,
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
  const [unmarkModal, setUnmarkModal] = useState({ isOpen: false, bill: null });
  const [attachmentsModalBill, setAttachmentsModalBill] = useState(null);
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState(null); // { attachmentId, bill }
  const [searchQuery, setSearchQuery] = useState('');

  // Refs to close swipeable rows (one row open at a time)
  const rowRefs = useRef({});

  // Fetch recurring bills
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: () => recurringBillService.getAll(),
  });

  // Summary for cards (align with desktop)
  const { data: summary } = useQuery({
    queryKey: ['recurringBillsSummary'],
    queryFn: () => recurringBillService.getSummary(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newBill) => recurringBillService.create(newBill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      notificationSuccess();
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
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      notificationSuccess();
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
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      notificationWarning();
      showToast(t('recurringBills.deleteSuccess', 'Bill deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Mark paid: API + loan/savings integration (desktop parity)
  const markPaidMutation = useMutation({
    mutationFn: ({ billId }) => recurringBillService.markPaid(billId),
    onMutate: async ({ billId }) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-bills'] });
      const previous = queryClient.getQueryData(['recurring-bills']);
      queryClient.setQueryData(['recurring-bills'], (old) => {
        const list = Array.isArray(old) ? old : old?.items ?? [];
        const updatedList = list.map((b) =>
          String(b.id) === String(billId) ? { ...b, isPaid: true } : b
        );
        return Array.isArray(old) ? updatedList : { ...old, items: updatedList };
      });
      return { previous };
    },
    onSuccess: async (_data, { bill }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bills'] });
      const loanRefMatch = bill?.notes?.match(/\[LOAN_REF:([^\]]+)\]/);
      const savingsRefMatch = bill?.notes?.match(/\[SAVINGS_REF:([^\]]+)\]/);
      if (loanRefMatch?.[1]) {
        try {
          await loanPaymentService.create({
            loanId: loanRefMatch[1],
            amount: parseFloat(bill.amount),
            principalAmount: parseFloat(bill.amount),
            interestAmount: 0,
            paymentDate: new Date().toISOString().split('T')[0],
            notes: 'Auto-payment from Recurring Bill',
          });
          queryClient.invalidateQueries({ queryKey: ['loans'] });
        } catch (e) {
          console.warn('Loan payment create failed:', e);
        }
      }
      if (savingsRefMatch?.[1]) {
        try {
          await savingsGoalService.addDeposit(savingsRefMatch[1], parseFloat(bill.amount));
          queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
        } catch (e) {
          console.warn('Savings deposit failed:', e);
        }
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(['recurring-bills'], context.previous);
      }
      showToast(error?.response?.data?.message || error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Unmark paid: used by confirmUnmark (with loan/savings revert)
  const unmarkPaidMutation = useMutation({
    mutationFn: (billId) => recurringBillService.unmarkPaid(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bills'] });
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || error.message || t('recurringBills.errorUnmarking', 'Failed to revert'), 'error');
    },
  });

  // Upload attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ billId, file }) => recurringBillService.uploadAttachment(billId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      showToast(t('recurringBills.attachmentAdded', 'Attachment added'), 'success');
    },
    onError: (error) => {
      showToast(error?.message || t('recurringBills.errorUploading', 'Failed to upload attachment'), 'error');
    },
  });

  // Delete attachment
  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ billId, attachmentId }) =>
      recurringBillService.deleteAttachment(billId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      showToast(t('recurringBills.attachmentDeleted', 'Attachment removed'), 'success');
      setDeleteAttachmentTarget(null);
      setAttachmentsModalBill((prev) => {
        if (!prev || prev.id !== variables.billId) return prev;
        return {
          ...prev,
          attachments: (prev.attachments || []).filter((a) => a.id !== variables.attachmentId),
        };
      });
    },
    onError: (error) => {
      showToast(error?.message || t('recurringBills.errorDeletingAttachment', 'Failed to delete attachment'), 'error');
    },
  });

  const openAttachmentsModal = (bill, e) => {
    if (e) e.stopPropagation?.();
    setAttachmentsModalBill(bill);
  };

  const addAttachmentForBill = useCallback(
    async (bill, useCamera) => {
      try {
        const permission = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast(t('recurringBills.permissionDenied', 'Permission to access camera or photos is required.'), 'error');
          return;
        }
        const result = useCamera
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const asset = result.assets[0];
        const filePayload = {
          uri: asset.uri,
          name: asset.fileName || `attachment_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        await uploadAttachmentMutation.mutateAsync({ billId: bill.id, file: filePayload });
        setAttachmentsModalBill((prev) => {
          if (!prev || prev.id !== bill.id) return prev;
          const newAtt = { id: 'temp', fileName: filePayload.name, url: asset.uri };
          return { ...prev, attachments: [...(prev.attachments || []), newAtt] };
        });
      } catch (err) {
        showToast(err?.message || t('recurringBills.errorUploading', 'Failed to upload attachment'), 'error');
      }
    },
    [showToast, t, uploadAttachmentMutation]
  );

  const showAddAttachmentOptions = (bill) => {
    Alert.alert(
      t('recurringBills.attachments', 'Attachments'),
      null,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.takePhoto', 'Take photo'), onPress: () => addAttachmentForBill(bill, true) },
        { text: t('profile.chooseFromGallery', 'Choose from gallery'), onPress: () => addAttachmentForBill(bill, false) },
      ]
    );
  };

  const handleDeleteAttachmentConfirm = () => {
    if (deleteAttachmentTarget) {
      deleteAttachmentMutation.mutate({
        billId: deleteAttachmentTarget.bill.id,
        attachmentId: deleteAttachmentTarget.attachmentId,
      });
    }
  };

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : data?.items ?? [];

  // Active bills only (desktop parity)
  const activeBills = useMemo(
    () => items.filter((b) => (b.isActive ?? b.is_active) !== false),
    [items]
  );

  // Search filter: name, notes, category (case-insensitive)
  const filterBillsBySearch = useCallback((billList, query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return billList;
    return billList.filter((b) => {
      const name = (b.name || '').toLowerCase();
      const notes = (b.notes || '').toLowerCase();
      const category = (b.category || '').toLowerCase();
      return name.includes(q) || notes.includes(q) || category.includes(q);
    });
  }, []);

  const filteredActiveBills = useMemo(
    () => filterBillsBySearch(activeBills, searchQuery),
    [activeBills, searchQuery, filterBillsBySearch]
  );

  // Date helpers (desktop parity) — use nextDueDate
  const getNextDueDate = useCallback((bill) => bill?.nextDueDate ?? bill?.next_due_date ?? null, []);
  const isOverdue = useCallback((dueDate) => {
    if (!dueDate) return false;
    const todayStart = startOfDay(new Date());
    return isBefore(new Date(dueDate), todayStart);
  }, []);
  const getDaysUntil = useCallback((dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }, []);

  const today = useMemo(() => new Date(), []);
  const currentMonthEnd = useMemo(() => endOfMonth(today), [today]);

  // Sectioned lists (desktop parity)
  const overdueBills = useMemo(
    () => filteredActiveBills.filter((b) => isOverdue(getNextDueDate(b))),
    [filteredActiveBills, isOverdue, getNextDueDate]
  );
  const dueThisMonthBills = useMemo(
    () =>
      filteredActiveBills.filter((b) => {
        const due = getNextDueDate(b);
        if (!due) return false;
        const d = new Date(due);
        return isSameMonth(d, today) && !isOverdue(due);
      }),
    [filteredActiveBills, getNextDueDate, today, isOverdue]
  );
  const paidThisMonthBills = useMemo(
    () =>
      filteredActiveBills.filter((b) => {
        const due = getNextDueDate(b);
        if (!due) return false;
        const freq = (b.frequency || '').toLowerCase();
        if (freq !== 'monthly' && freq !== 'weekly') return false;
        const d = new Date(due);
        return isAfter(d, currentMonthEnd) && !isAfter(d, addMonths(currentMonthEnd, 1));
      }),
    [filteredActiveBills, getNextDueDate, currentMonthEnd]
  );
  const excludeSectionIds = useMemo(
    () =>
      new Set([
        ...overdueBills.map((b) => b.id),
        ...dueThisMonthBills.map((b) => b.id),
        ...paidThisMonthBills.map((b) => b.id),
      ]),
    [overdueBills, dueThisMonthBills, paidThisMonthBills]
  );
  const futureBills = useMemo(
    () => filteredActiveBills.filter((b) => !excludeSectionIds.has(b.id)),
    [filteredActiveBills, excludeSectionIds]
  );

  // Summary calculations (desktop parity)
  const calculateCurrentMonthUnpaid = useCallback(() => {
    const overdueTotal = activeBills
      .filter((b) => isOverdue(getNextDueDate(b)))
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const dueThisMonthTotal = activeBills
      .filter((b) => {
        const due = getNextDueDate(b);
        if (!due) return false;
        const d = new Date(due);
        return isSameMonth(d, today) && !isOverdue(due);
      })
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    return overdueTotal + dueThisMonthTotal;
  }, [activeBills, isOverdue, getNextDueDate, today]);

  const calculateNextMonthTotal = useCallback(() => {
    const nextMonthDate = addMonths(today, 1);
    const startOfNext = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1);
    const endOfNext = endOfMonth(nextMonthDate);
    let total = 0;
    activeBills.forEach((bill) => {
      const amount = parseFloat(bill.amount || 0);
      const freq = (bill.frequency || 'monthly').toLowerCase();
      const nextDue = getNextDueDate(bill);
      if (!nextDue) return;
      let pointer = new Date(nextDue);
      if (isAfter(pointer, endOfNext)) return;
      let itemsChecked = 0;
      while ((isBefore(pointer, endOfNext) || isSameMonth(pointer, endOfNext)) && itemsChecked < 52) {
        itemsChecked++;
        if (isSameMonth(pointer, nextMonthDate)) total += amount;
        if (freq === 'weekly') pointer = addWeeks(pointer, 1);
        else if (freq === 'monthly') pointer = addMonths(pointer, 1);
        else if (freq === 'quarterly') pointer = addMonths(pointer, 3);
        else if (freq === 'yearly') pointer = addYears(pointer, 1);
        else pointer = addMonths(pointer, 1);
      }
    });
    return total;
  }, [activeBills, getNextDueDate, today]);

  const currentMonthUnpaidAmount = useMemo(() => calculateCurrentMonthUnpaid(), [calculateCurrentMonthUnpaid]);
  const nextMonthProjectedAmount = useMemo(() => calculateNextMonthTotal(), [calculateNextMonthTotal]);

  // Normalize isPaid (API may return isPaid or IsPaid)
  const getIsPaid = useCallback((bill) => bill?.isPaid ?? bill?.IsPaid ?? false, []);

  // Format due date for display (nextDueDate-based)
  const formatDueDate = useCallback((date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

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

  // Mark paid (tap or swipe right) — API + loan/savings (desktop parity)
  const handleMarkPaid = useCallback(
    (item) => {
      if (getIsPaid(item)) return;
      impactLight();
      markPaidMutation.mutate({ billId: item.id, bill: item });
      setTimeout(() => rowRefs.current[item.id]?.close(), 200);
    },
    [getIsPaid, markPaidMutation]
  );

  // Unmark: open confirmation modal (desktop parity)
  const handleUnmarkPaid = useCallback((bill) => {
    setUnmarkModal({ isOpen: true, bill });
  }, []);

  // Confirm unmark: API + revert loan payment + savings withdraw
  const confirmUnmark = useCallback(async () => {
    const { bill } = unmarkModal;
    if (!bill) return;
    setUnmarkModal({ isOpen: false, bill: null });
    try {
      await unmarkPaidMutation.mutateAsync(bill.id);
      const loanRefMatch = bill.notes?.match(/\[LOAN_REF:([^\]]+)\]/);
      if (loanRefMatch?.[1]) {
        const payments = await loanPaymentService.getByLoan(loanRefMatch[1]);
        const todayStr = new Date().toISOString().split('T')[0];
        const paymentToDelete = payments.find(
          (p) =>
            (p.paymentDate?.split?.('T')[0] || p.paymentDate) === todayStr &&
            Math.abs(parseFloat(p.amount) - parseFloat(bill.amount)) < 0.01 &&
            (p.notes || '').includes('Auto-payment')
        );
        if (paymentToDelete) {
          await loanPaymentService.delete(paymentToDelete.id);
          queryClient.invalidateQueries({ queryKey: ['loans'] });
        }
      }
      const savingsRefMatch = bill.notes?.match(/\[SAVINGS_REF:([^\]]+)\]/);
      if (savingsRefMatch?.[1]) {
        await savingsGoalService.withdraw(savingsRefMatch[1], parseFloat(bill.amount));
        queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      }
      showToast(t('recurringBills.revertSuccess', 'Payment reverted'), 'success');
    } catch (err) {
      showToast(err?.message || t('recurringBills.errorUnmarking', 'Failed to revert'), 'error');
    }
  }, [unmarkModal, unmarkPaidMutation, queryClient, showToast, t]);

  // Swipe left → delete (desktop parity): open delete confirmation
  const handleSwipeDelete = useCallback((item) => {
    impactLight();
    setDeleteTarget(item);
    setTimeout(() => rowRefs.current[item.id]?.close(), 200);
  }, []);

  // Close other rows when one opens (one swiped at a time)
  const handleSwipeableWillOpen = useCallback((itemId) => {
    Object.keys(rowRefs.current).forEach((id) => {
      if (id !== String(itemId)) rowRefs.current[id]?.close();
    });
  }, []);

  // Underlay: swipe row RIGHT reveals left panel → "Mark Paid"
  const renderLeftActions = useCallback(
    (item) => (
      <View style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: theme.colors.success }]}>
        <CheckCircle size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('recurringBills.paid', 'Paid')}</Text>
      </View>
    ),
    [theme.colors.success, t]
  );

  // Underlay: swipe row LEFT reveals right panel → "Delete"
  const renderRightActions = useCallback(
    (item) => (
      <View style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: theme.colors.error }]}>
        <Trash2 size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.delete', 'Delete')}</Text>
      </View>
    ),
    [theme.colors.error, t]
  );

  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBill(null);
  };

  // Format amount (privacy-aware)
  const formatAmount = useCallback(
    (amount) => {
      if (isPrivate) return '••••';
      return `€${Number(amount).toFixed(2)}`;
    },
    [isPrivate]
  );

  // Due status from nextDueDate: days left / tomorrow / overdue (desktop parity)
  const getDueStatusLabel = useCallback(
    (bill) => {
      const due = getNextDueDate(bill);
      if (!due) return null;
      const days = getDaysUntil(due);
      if (days < 0) return { label: `${Math.abs(days)} ${t('recurringBills.daysOverdue', 'days overdue')}`, color: theme.colors.error };
      if (days === 0) return { label: t('recurringBills.today', 'Today'), color: theme.colors.warning };
      if (days === 1) return { label: t('recurringBills.tomorrow', 'Tomorrow'), color: theme.colors.warning };
      if (days <= 7) return { label: `${days} ${t('recurringBills.daysLeft', 'days')}`, color: theme.colors.warning };
      return null;
    },
    [getNextDueDate, getDaysUntil, theme.colors.error, theme.colors.warning, t]
  );

  // Render a single bill card (used in sectioned list)
  const renderBillCard = useCallback(
    (item) => {
      const dueStatus = getDueStatusLabel(item);
      const nextDue = getNextDueDate(item);

      return (
        <Swipeable
          key={item.id}
          ref={(r) => {
            rowRefs.current[item.id] = r;
          }}
          renderRightActions={() => renderRightActions(item)}
          renderLeftActions={() => renderLeftActions(item)}
          onSwipeableLeftOpen={() => handleMarkPaid(item)}
          onSwipeableRightOpen={() => handleSwipeDelete(item)}
          onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
          friction={2}
          rightThreshold={40}
          leftThreshold={40}
          accessibilityLabel={item.name}
          accessibilityHint={t('recurringBills.swipeHintDelete', 'Swipe right to mark paid, left to delete')}
        >
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
            onPress={() => handleEdit(item)}
            onLongPress={() => setDeleteTarget(item)}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              {/* Paid Toggle / Mark paid */}
              <TouchableOpacity
                style={styles.paidToggle}
                onPress={() => !getIsPaid(item) && handleMarkPaid(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {getIsPaid(item) ? (
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
                    getIsPaid(item) && styles.cardTitlePaid,
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
                {nextDue && (
                  <View style={styles.dueRow}>
                    <Calendar size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.dueDayText, { color: theme.colors.textSecondary }]}>
                      {t('recurringBills.dueOn', 'Due on')} {formatDueDate(nextDue)}
                    </Text>
                    {dueStatus && (
                      <View style={[styles.dueBadge, { backgroundColor: `${dueStatus.color}15` }]}>
                        <Text style={[styles.dueBadgeText, { color: dueStatus.color }]}>{dueStatus.label}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text style={[styles.cardAmount, { color: theme.colors.primary }]}>{formatAmount(item.amount)}</Text>
                {item.autoPay && (
                  <View style={[styles.autoPayBadge, { backgroundColor: `${theme.colors.success}15` }]}>
                    <Text style={[styles.autoPayText, { color: theme.colors.success }]}>{t('recurringBills.auto', 'Auto')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Actions: Attachments, Edit, Unmark (if paid), Delete */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
                onPress={() => openAttachmentsModal(item)}
                activeOpacity={0.7}
                accessibilityLabel={t('recurringBills.attachments', 'Attachments')}
              >
                <Paperclip size={16} color={theme.colors.primary} />
                {(item.attachments?.length ?? 0) > 0 && (
                  <View style={[styles.attachmentBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.attachmentBadgeText}>{item.attachments.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
                onPress={() => handleEdit(item)}
                activeOpacity={0.7}
              >
                <Pencil size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              {getIsPaid(item) && (
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: `${theme.colors.warning}15` }]}
                  onPress={() => handleUnmarkPaid(item)}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color={theme.colors.warning} />
                </TouchableOpacity>
              )}
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
    },
    [
      getDueStatusLabel,
      getNextDueDate,
      getIsPaid,
      formatDueDate,
      formatAmount,
      theme,
      t,
      renderRightActions,
      renderLeftActions,
      handleMarkPaid,
      handleSwipeDelete,
      handleUnmarkPaid,
    ]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // No search results vs no bills
  const hasNoSearchResults = searchQuery.trim() && filteredActiveBills.length === 0 && items.length > 0;
  const hasNoBills = items.length === 0;

  // Show loading on first fetch so we don't flash empty state (after all hooks to satisfy Rules of Hooks)
  if (isLoading && (data === undefined || data === null)) {
    return <ScreenLoading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header: title + Add button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('recurringBills.title', 'Recurring Bills')}
        </Text>
        <TouchableOpacity
          onPress={() => { impactMedium(); setIsFormOpen(true); }}
          style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          accessibilityLabel={t('recurringBills.addNew', 'Add new bill')}
          accessibilityRole="button"
        >
          <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Summary cards (desktop parity) */}
      {summary != null && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryScrollContent}
        >
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('recurringBills.totalBills', 'Total Bills')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.activeBills ?? 0}</Text>
            <Text style={[styles.summaryDetail, { color: theme.colors.textLight }]}>
              {(summary.inactiveBills ?? 0)} {t('recurringBills.inactive', 'inactive')}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('recurringBills.remainingThisMonth', 'Remaining This Month')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>{formatAmount(currentMonthUnpaidAmount)}</Text>
            <Text style={[styles.summaryDetail, { color: theme.colors.textLight }]}>
              {t('recurringBills.monthlyTotal', 'Monthly')}: {formatAmount(summary.totalMonthlyAmount ?? 0)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('recurringBills.nextMonthTotal', 'Next Month (Est.)')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatAmount(nextMonthProjectedAmount)}</Text>
            <Text style={[styles.summaryDetail, { color: theme.colors.textLight }]}>{t('recurringBills.forecast', 'Forecast')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('recurringBills.upcoming', 'Upcoming')}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.upcomingBills ?? 0}</Text>
            <Text style={[styles.summaryDetail, { color: theme.colors.textLight }]}>
              {(summary.overdueBills ?? 0)} {t('recurringBills.overdue', 'overdue')}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Search bar (desktop parity) */}
      <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('recurringBills.searchPlaceholder', 'Search bills...')}
          placeholderTextColor={theme.colors.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Text style={[styles.searchClear, { color: theme.colors.primary }]}>{t('common.clear', 'Clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No search results */}
      {hasNoSearchResults && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>{t('recurringBills.noSearchResults', 'No bills match your search.')}</Text>
          <Button title={t('recurringBills.clearSearch', 'Clear search')} onPress={() => setSearchQuery('')} variant="secondary" style={styles.clearSearchBtn} />
        </View>
      )}

      {/* Sectioned list: Overdue, Due This Month, Paid This Month, Future */}
      {!hasNoSearchResults && (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {hasNoBills && (
            <EmptyState
              icon={CalendarClock}
              title={t('recurringBills.emptyTitle', 'No recurring bills yet')}
              description={t('recurringBills.emptyDescription', 'Add your subscriptions and recurring payments to never miss a due date.')}
              ctaLabel={t('recurringBills.addFirst', 'Add Bill')}
              onPress={() => setIsFormOpen(true)}
            />
          )}

          {overdueBills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                {t('recurringBills.overdueBills', 'Overdue Bills')} ({overdueBills.length})
              </Text>
              {overdueBills.map((bill) => renderBillCard(bill))}
            </View>
          )}

          {dueThisMonthBills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('recurringBills.dueThisMonth', 'Due This Month')} ({dueThisMonthBills.length})
              </Text>
              {dueThisMonthBills.map((bill) => renderBillCard(bill))}
            </View>
          )}

          {paidThisMonthBills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>
                {t('recurringBills.paidThisMonth', 'Paid This Month')} ({paidThisMonthBills.length})
              </Text>
              {paidThisMonthBills.map((bill) => renderBillCard(bill))}
            </View>
          )}

          {futureBills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('recurringBills.futureBills', 'Upcoming & Future')} ({futureBills.length})
              </Text>
              {futureBills.map((bill) => renderBillCard(bill))}
            </View>
          )}
        </ScrollView>
      )}

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

      {/* Unmark / Revert Payment Confirmation (desktop parity) */}
      <ConfirmationModal
        isOpen={unmarkModal.isOpen}
        onClose={() => setUnmarkModal({ isOpen: false, bill: null })}
        onConfirm={confirmUnmark}
        title={t('recurringBills.confirmUnmarkTitle', 'Revert Payment?')}
        message={t('recurringBills.confirmUnmarkMessage', 'This will revert the due date to the previous cycle and remove any linked loan payment created today. Are you sure?')}
        confirmText={t('recurringBills.revert', 'Revert')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="warning"
        loading={unmarkPaidMutation.isPending}
      />

      {/* Attachments Modal */}
      <Modal
        isOpen={attachmentsModalBill !== null}
        onClose={() => { setAttachmentsModalBill(null); setDeleteAttachmentTarget(null); }}
        title={`${attachmentsModalBill?.name ?? ''} – ${t('recurringBills.attachments', 'Attachments')}`}
      >
        {attachmentsModalBill && (
          <ScrollView style={styles.attachmentsModalScroll}>
            <Button
              title={t('recurringBills.addAttachment', 'Add attachment')}
              onPress={() => showAddAttachmentOptions(attachmentsModalBill)}
              loading={uploadAttachmentMutation.isPending}
              variant="secondary"
              style={styles.attachmentsAddBtn}
            />
            {(attachmentsModalBill.attachments?.length ?? 0) === 0 ? (
              <Text style={[styles.attachmentsEmpty, { color: theme.colors.textSecondary }]}>
                {t('recurringBills.noAttachments', 'No attachments yet')}
              </Text>
            ) : (
              (attachmentsModalBill.attachments || []).map((att) => (
                <View
                  key={att.id}
                  style={[styles.attachmentRow, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
                >
                  <TouchableOpacity
                    style={styles.attachmentRowLeft}
                    onPress={() => att.url && (att.url.startsWith('http') ? Linking.openURL(att.url) : null)}
                    activeOpacity={att.url && att.url.startsWith('http') ? 0.7 : 1}
                  >
                    <ExternalLink size={16} color={theme.colors.primary} />
                    <Text style={[styles.attachmentName, { color: theme.colors.text }]} numberOfLines={1}>
                      {att.fileName || att.name || t('recurringBills.attachment', 'Attachment')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.attachmentDeleteBtn, { backgroundColor: `${theme.colors.error}15` }]}
                    onPress={() => setDeleteAttachmentTarget({ attachmentId: att.id, bill: attachmentsModalBill })}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </Modal>

      {/* Delete attachment confirmation */}
      <ConfirmationModal
        isOpen={deleteAttachmentTarget !== null}
        onClose={() => setDeleteAttachmentTarget(null)}
        onConfirm={handleDeleteAttachmentConfirm}
        title={t('recurringBills.deleteAttachmentTitle', 'Delete attachment?')}
        message={t('recurringBills.confirmDeleteAttachment', 'Are you sure you want to delete this attachment?')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deleteAttachmentMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    flex: 1,
  },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryScroll: {
    maxHeight: 100,
    marginBottom: spacing.sm,
  },
  summaryScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    minWidth: 140,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 18,
  },
  summaryDetail: {
    ...typography.caption,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
  },
  searchClear: {
    ...typography.label,
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 100, // Clear floating tab bar
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  clearSearchBtn: {
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    position: 'relative',
  },
  attachmentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  attachmentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  attachmentsModalScroll: { maxHeight: 320 },
  attachmentsAddBtn: { marginBottom: spacing.md },
  attachmentsEmpty: { ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.lg },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  attachmentRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attachmentName: { ...typography.body, flex: 1 },
  attachmentDeleteBtn: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
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
});
