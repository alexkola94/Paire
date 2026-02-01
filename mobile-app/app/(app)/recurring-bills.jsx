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
 * - Attachments per bill (upload, list, delete) via modal
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
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Pencil, Trash2, CheckCircle, Circle, Calendar, Paperclip, ExternalLink } from 'lucide-react-native';
import { recurringBillService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  Button,
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
  const [attachmentsModalBill, setAttachmentsModalBill] = useState(null);
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState(null); // { attachmentId, bill }

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

  // Toggle paid status: use backend mark-paid / unmark-paid endpoints
  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, isPaid }) => {
      if (isPaid) return recurringBillService.unmarkPaid(id);
      return recurringBillService.markPaid(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recurringBillsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bills'] });
    },
    onError: (error) => {
      showToast(error?.response?.data?.message || error.message || t('common.error', 'An error occurred'), 'error');
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
