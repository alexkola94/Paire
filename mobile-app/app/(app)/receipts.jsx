/**
 * Receipts Screen (React Native)
 * View and manage transaction receipts.
 * 
 * Features:
 * - List transactions with receipts
 * - View receipt image in fullscreen
 * - Delete receipt with confirmation
 * - Pull-to-refresh
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
  Image,
  Modal as RNModal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, X, ZoomIn, ExternalLink } from 'lucide-react-native';
import { transactionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { ConfirmationModal, useToast } from '../../components';

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

  // Fetch receipts (transactions with attachments)
  const { data, refetch } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => transactionService.getReceipts(),
  });

  // Delete receipt mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId) => transactionService.deleteReceipt(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      showToast(t('receipts.deleteSuccess', 'Receipt deleted successfully'), 'success');
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

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
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
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('receipts.title', 'Receipts')}
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
            <FileText size={48} color={theme.colors.textLight} />
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {t('receipts.empty', 'No receipts yet. Add receipts to your transactions!')}
            </Text>
          </View>
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
