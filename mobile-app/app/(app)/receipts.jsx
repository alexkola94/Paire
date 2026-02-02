/**
 * Receipts Screen (React Native)
 * View and manage transaction receipts.
 *
 * Features:
 * - List transactions with receipts
 * - View receipt image in fullscreen
 * - Delete receipt with confirmation
 * - Add receipt (camera or gallery) -> upload -> create transaction with attachment
 * - Pull-to-refresh, theme-aware styling
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal as RNModal,
  Pressable,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { FileText, Trash2, X, ZoomIn, Plus } from 'lucide-react-native';
import { transactionService, storageService, recurringBillService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { ConfirmationModal, EmptyState, useToast } from '../../components';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReceiptsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch receipts: transaction receipts + recurring bill attachments (same as web)
  const { data, refetch } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const [transactions, recurringBills] = await Promise.all([
        transactionService.getReceipts({ category: null, search: '' }),
        recurringBillService.getAll(),
      ]);
      const txReceipts = (Array.isArray(transactions) ? transactions : []).map((t) => ({
        ...t,
        type: 'transaction',
        uniqueId: `tx-${t.id}`,
      }));
      let billAttachments = [];
      if (recurringBills && Array.isArray(recurringBills)) {
        recurringBills.forEach((bill) => {
          if (bill.attachments && bill.attachments.length > 0) {
            bill.attachments.forEach((att) => {
              billAttachments.push({
                id: att.id,
                type: 'recurring',
                billId: bill.id,
                uniqueId: `rec-${att.id}`,
                attachmentUrl: att.fileUrl,
                amount: bill.amount,
                category: bill.category,
                description: `${bill.name || ''} - ${att.fileName || ''}`.trim(),
                date: att.uploadedAt || bill.createdAt,
                user_profiles: bill.user_profiles,
                notes: bill.notes,
                name: bill.name,
                type: 'expense', // for amount display
              });
            });
          }
        });
      }
      const merged = [...txReceipts, ...billAttachments].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      return merged;
    },
  });

  // Delete receipt mutation (transaction or recurring attachment)
  const deleteMutation = useMutation({
    mutationFn: async (target) => {
      if (target.type === 'recurring') {
        await recurringBillService.deleteAttachment(target.billId, target.id);
      } else {
        await transactionService.deleteReceipt(target.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['recurringbills'] });
      showToast(t('receipts.deleteSuccess', 'Receipt deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Add receipt: pick image -> upload -> create transaction with attachmentUrl
  const pickAndUploadReceipt = useCallback(
    async (useCamera) => {
      try {
        const permission = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast(t('receipts.permissionDenied', 'Permission to access camera or photos is required.'), 'error');
          return;
        }
        const result = useCamera
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const asset = result.assets[0];
        setUploading(true);
        const file = {
          uri: asset.uri,
          name: asset.fileName || `receipt_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        const uploadRes = await storageService.uploadFile(file);
        const url = uploadRes?.url || uploadRes?.path;
        if (!url) throw new Error('No URL returned');
        await transactionService.create({
          type: 'expense',
          amount: 0,
          description: t('receipts.receiptEntry', 'Receipt'),
          date: new Date().toISOString().split('T')[0],
          category: 'other',
          attachmentUrl: url,
        });
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['income'] });
        showToast(t('receipts.uploadSuccess', 'Receipt added. You can edit the transaction to add amount and category.'), 'success');
      } catch (err) {
        showToast(err?.message || t('receipts.uploadError', 'Failed to add receipt.'), 'error');
      } finally {
        setUploading(false);
      }
    },
    [queryClient, showToast, t]
  );

  const showAddReceiptOptions = useCallback(() => {
    Alert.alert(
      t('receipts.addReceipt', 'Add receipt'),
      null,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('receipts.takePhoto', 'Take photo'), onPress: () => pickAndUploadReceipt(true) },
        { text: t('receipts.chooseFromGallery', 'Choose from gallery'), onPress: () => pickAndUploadReceipt(false) },
      ]
    );
  }, [t, pickAndUploadReceipt]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : [];

  // Handle delete confirmation (transaction or recurring attachment)
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget);
    }
  };

  // View receipt
  const handleViewReceipt = (item) => {
    if (item.attachmentUrl) {
      setViewingReceipt(item);
    }
  };

  // Format amount
  const formatAmount = (amount, type) => {
    if (isPrivate) return '••••';
    const prefix = type === 'expense' ? '-' : '+';
    return `${prefix}€${amount?.toFixed(2)}`;
  };

  // Render item
  const renderItem = ({ item }) => {
    const hasReceipt = !!item.attachmentUrl;
    
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}
        onPress={() => hasReceipt && handleViewReceipt(item)}
        activeOpacity={hasReceipt ? 0.7 : 1}
      >
        <View style={styles.row}>
          {/* Receipt Thumbnail */}
          <View style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceSecondary }]}>
            {hasReceipt ? (
              <Image
                source={{ uri: item.attachmentUrl }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <FileText size={24} color={theme.colors.textLight} />
            )}
            {hasReceipt && (
              <View style={[styles.zoomIcon, { backgroundColor: theme.colors.primary }]}>
                <ZoomIn size={12} color="#ffffff" />
              </View>
            )}
          </View>

          {/* Transaction Info */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.description || t(`categories.${item.category}`, item.category)}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()}
              {' • '}
              {t(`categories.${item.category}`, item.category)}
            </Text>
          </View>

          {/* Amount and Actions */}
          <View style={styles.rightContainer}>
            <Text
              style={[
                styles.cardAmount,
                { color: item.type === 'expense' ? theme.colors.error : theme.colors.success },
              ]}
            >
              {formatAmount(item.amount, item.type)}
            </Text>
            
            {hasReceipt && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: `${theme.colors.error}15` }]}
                onPress={() => setDeleteTarget(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('receipts.title', 'Receipts')}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={showAddReceiptOptions}
          disabled={uploading}
          accessibilityLabel={t('receipts.addReceipt', 'Add receipt')}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.uniqueId || String(i.id)}
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
            icon={FileText}
            title={t('receipts.emptyTitle', 'No receipts yet')}
            description={t('receipts.emptyDescription', 'Snap a photo of your receipts to keep a digital record.')}
            ctaLabel={t('receipts.addFirst', 'Add Receipt')}
            onPress={showAddReceiptOptions}
          />
        }
      />

      {/* Fullscreen Receipt Viewer */}
      <RNModal
        visible={viewingReceipt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingReceipt(null)}
        statusBarTranslucent
      >
        <View style={styles.viewerOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.viewerCloseBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => setViewingReceipt(null)}
            activeOpacity={0.8}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Receipt Image */}
          <Pressable style={styles.viewerImageContainer} onPress={() => setViewingReceipt(null)}>
            {viewingReceipt?.attachmentUrl && (
              <Image
                source={{ uri: viewingReceipt.attachmentUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            )}
          </Pressable>

          {/* Receipt Info */}
          <View style={[styles.viewerInfo, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.viewerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {viewingReceipt?.description || t(`categories.${viewingReceipt?.category}`, viewingReceipt?.category)}
            </Text>
            <Text style={[styles.viewerSub, { color: theme.colors.textSecondary }]}>
              {viewingReceipt?.date && new Date(viewingReceipt.date).toLocaleDateString()}
              {' • '}
              {formatAmount(viewingReceipt?.amount, viewingReceipt?.type)}
            </Text>
          </View>
        </View>
      </RNModal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('receipts.deleteTitle', 'Delete Receipt')}
        message={t('receipts.deleteMessage', 'Are you sure you want to delete this receipt? The transaction will remain.')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h2,
    flex: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  zoomIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  rightContainer: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  deleteBtn: {
    marginTop: spacing.xs,
    padding: spacing.xs,
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
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  // Viewer styles
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  viewerImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: SCREEN_HEIGHT * 0.6,
  },
  viewerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  viewerTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  viewerSub: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
});
