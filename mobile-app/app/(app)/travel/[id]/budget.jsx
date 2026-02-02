/**
 * Trip Budget Screen (React Native)
 * List trip expenses by category; add/edit/delete; show total vs budget.
 */

import { useState, useCallback } from 'react';
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
import { ChevronLeft, Plus, Pencil, Trash2, DollarSign } from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, useToast, ConfirmationModal } from '../../../../components';

const BUDGET_CATEGORIES = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'other'];

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
    return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

export default function TripBudgetScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formCategory, setFormCategory] = useState('food');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  const { data: expenses = [], refetch, isFetching } = useQuery({
    queryKey: ['travel-expenses', id],
    queryFn: () => travelService.getExpenses(id),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => travelService.createExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses', id] });
      showToast(t('travel.budget.expenseAdded', 'Expense added'), 'success');
      setAddModalOpen(false);
      resetForm();
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ expenseId, ...payload }) => travelService.updateExpense(id, expenseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses', id] });
      showToast(t('travel.budget.expenseUpdated', 'Expense updated'), 'success');
      setEditingExpense(null);
      resetForm();
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId) => travelService.deleteExpense(id, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses', id] });
      showToast(t('travel.budget.expenseDeleted', 'Expense deleted'), 'success');
      setDeleteTarget(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const resetForm = () => {
    setFormCategory('food');
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const totalSpent = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budgetLimit = trip ? Number(trip.budget) || 0 : 0;
  const currency = trip?.budgetCurrency || 'EUR';

  const openEdit = (item) => {
    setEditingExpense(item);
    setFormCategory(item.category || 'food');
    setFormAmount(String(item.amount || ''));
    setFormDescription(item.description || '');
    setFormDate((item.date || '').toString().split('T')[0] || new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = () => {
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast(t('validation.required', { field: t('travel.budget.amount', 'Amount') }), 'error');
      return;
    }
    const payload = {
      category: formCategory,
      amount,
      description: formDescription.trim() || formCategory,
      date: formDate,
      currency,
    };
    if (editingExpense) {
      updateMutation.mutate({ expenseId: editingExpense.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={() => openEdit(item)}
      onLongPress={() => setDeleteTarget(item)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.description || item.category || '—'}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
            {t(`travel.budget.categories.${item.category}`, item.category)} • {formatDate(item.date)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: theme.colors.error }]}>
          -{currency === 'EUR' ? '€' : currency}{Number(item.amount || 0).toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (tripLoading || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.budget.title', 'Budget')}</Text>
        <TouchableOpacity
          onPress={() => { setEditingExpense(null); resetForm(); setAddModalOpen(true); }}
          style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          accessibilityLabel={t('travel.budget.addExpense', 'Add expense')}
          accessibilityRole="button"
        >
          <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
          <DollarSign size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              {t('travel.budget.spent', 'Spent')}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {currency === 'EUR' ? '€' : ''}{totalSpent.toFixed(2)} {currency}
            </Text>
          </View>
          {budgetLimit > 0 && (
            <Text style={[styles.summaryBudget, { color: theme.colors.textSecondary }]}>
              / {currency === 'EUR' ? '€' : ''}{budgetLimit.toFixed(2)}
            </Text>
          )}
        </View>

        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {t('travel.budget.noExpenses', 'No expenses yet. Tap + to add.')}
            </Text>
          }
        />
      </ScrollView>

      <Modal
        isOpen={addModalOpen || !!editingExpense}
        onClose={() => { setAddModalOpen(false); setEditingExpense(null); resetForm(); }}
        title={editingExpense ? t('travel.budget.editExpense', 'Edit expense') : t('travel.budget.addExpense', 'Add expense')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.budget.category', 'Category')}</Text>
            <View style={styles.categoryWrap}>
              {BUDGET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface },
                    formCategory === cat && { backgroundColor: theme.colors.primary + '30', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: formCategory === cat ? theme.colors.primary : theme.colors.text }]}>
                    {t(`travel.budget.categories.${cat}`, cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.budget.amount', 'Amount')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const n = prompt(t('travel.budget.amount', 'Amount'), formAmount || '0');
                if (n != null) setFormAmount(String(n).replace(/,/g, '.'));
              }}
            >
              <Text style={{ color: theme.colors.text }}>{formAmount || '0'} {currency}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('transaction.description', 'Description')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const d = prompt(t('transaction.description', 'Description'), formDescription);
                if (d != null) setFormDescription(d);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formDescription || '—'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('transaction.date', 'Date')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const d = prompt(t('transaction.date', 'Date (YYYY-MM-DD)'), formDate);
                if (d != null) setFormDate(d);
              }}
            >
              <Text style={{ color: theme.colors.text }}>{formDate}</Text>
            </TouchableOpacity>
          </View>
          <Button
            title={editingExpense ? t('common.save') : t('travel.budget.addExpense', 'Add expense')}
            onPress={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('travel.budget.deleteExpense', 'Delete expense?')}
        message={t('travel.budget.deleteConfirm', 'This cannot be undone.')}
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
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: 100 }, // Clear floating tab bar
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.h3 },
  summaryBudget: { ...typography.body },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardSub: { ...typography.bodySmall, marginTop: 2 },
  amount: { ...typography.body, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: spacing.lg, ...typography.body },
  formRow: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  input: { ...typography.body, padding: spacing.sm, borderWidth: 1, borderRadius: borderRadius.sm },
  inputTouch: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  categoryChipText: { ...typography.caption },
});
