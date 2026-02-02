/**
 * Trip Packing Screen (React Native)
 * Packing list by category; add/check/delete.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Check, Square, Trash2, Package } from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, useToast, ConfirmationModal } from '../../../../components';

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'medications', 'other'];

export default function TripPackingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('clothing');
  const [formQuantity, setFormQuantity] = useState('1');

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  const { data: items = [], refetch, isFetching } = useQuery({
    queryKey: ['travel-packing', id],
    queryFn: () => travelService.getPackingItems(id),
    enabled: !!id,
  });

  const byCategory = useMemo(() => {
    const map = {};
    PACKING_CATEGORIES.forEach((c) => { map[c] = []; });
    (items || []).forEach((item) => {
      const cat = item.category || 'other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [items]);

  const createMutation = useMutation({
    mutationFn: (payload) => travelService.createPackingItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-packing', id] });
      showToast(t('travel.packing.itemAdded', 'Item added'), 'success');
      setAddModalOpen(false);
      setFormName('');
      setFormCategory('clothing');
      setFormQuantity('1');
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, ...payload }) => travelService.updatePackingItem(id, itemId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travel-packing', id] }),
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId) => travelService.deletePackingItem(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-packing', id] });
      showToast(t('travel.packing.itemDeleted', 'Item removed'), 'success');
      setDeleteTarget(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleChecked = (item) => {
    updateMutation.mutate({ itemId: item.id, isPacked: !item.isPacked });
  };

  const handleSubmit = () => {
    const name = formName.trim();
    if (!name) {
      showToast(t('validation.required', { field: t('travel.packing.itemName', 'Item name') }), 'error');
      return;
    }
    createMutation.mutate({
      name,
      category: formCategory,
      quantity: parseInt(formQuantity, 10) || 1,
      isPacked: false,
    });
  };

  const renderItem = (item) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={() => toggleChecked(item)}
      onLongPress={() => setDeleteTarget(item)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        {item.isPacked ? (
          <Check size={22} color={theme.colors.success} />
        ) : (
          <Square size={22} color={theme.colors.textLight} />
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text
            style={[
              styles.itemName,
              { color: theme.colors.text },
              item.isPacked && styles.itemNameStrike,
            ]}
            numberOfLines={1}
          >
            {item.name || '—'}
          </Text>
          {(item.quantity > 1) && (
            <Text style={[styles.itemQty, { color: theme.colors.textSecondary }]}>
              × {item.quantity}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (tripLoading || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.packing.title', 'Packing')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {PACKING_CATEGORIES.map((cat) => {
          const list = byCategory[cat] || [];
          if (list.length === 0) return null;
          return (
            <View key={cat} style={styles.categoryBlock}>
              <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
                {t(`travel.packing.categories.${cat}`, cat)}
              </Text>
              {list.map((item) => (
                <View key={item.id}>{renderItem(item)}</View>
              ))}
            </View>
          );
        })}
        {items.length === 0 && (
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>
            {t('travel.packing.noItems', 'No items yet. Tap + to add.')}
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setAddModalOpen(true)}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setFormName(''); setFormCategory('clothing'); setFormQuantity('1'); }}
        title={t('travel.packing.addItem', 'Add item')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.packing.itemName', 'Item name')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.packing.itemName', 'Item name'), formName);
                if (v != null) setFormName(v);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formName || '—'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.packing.category', 'Category')}</Text>
            <View style={styles.chipWrap}>
              {PACKING_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface },
                    formCategory === c && { backgroundColor: theme.colors.primary + '30', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setFormCategory(c)}
                >
                  <Text style={[styles.chipText, { color: formCategory === c ? theme.colors.primary : theme.colors.text }]}>
                    {t(`travel.packing.categories.${c}`, c)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.packing.quantity', 'Quantity')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.packing.quantity', 'Quantity'), formQuantity);
                if (v != null) setFormQuantity(String(parseInt(v, 10) || 1));
              }}
            >
              <Text style={{ color: theme.colors.text }}>{formQuantity}</Text>
            </TouchableOpacity>
          </View>
          <Button title={t('travel.packing.addItem', 'Add item')} onPress={handleSubmit} loading={createMutation.isPending} />
        </ScrollView>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('travel.packing.deleteItem', 'Remove item?')}
        message={t('travel.packing.deleteMessage', 'Are you sure you want to remove this item?')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { flex: 1, ...typography.h3 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  categoryBlock: { marginBottom: spacing.lg },
  categoryTitle: { ...typography.label, marginBottom: spacing.sm },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  itemName: { ...typography.body, fontWeight: '500' },
  itemNameStrike: { textDecorationLine: 'line-through', opacity: 0.7 },
  itemQty: { ...typography.caption, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  formRow: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputTouch: { padding: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  chipText: { ...typography.caption },
});
