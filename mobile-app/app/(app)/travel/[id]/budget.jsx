/**
 * Trip Budget Screen (React Native)
 * List trip expenses by category; add/edit/delete. Uses travelService.getExpenses/createExpense/updateExpense/deleteExpense.
 */

import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, useToast, ConfirmationModal } from '../../../../components';

const BUDGET_CATEGORIES = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'other'];

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = String(d).split('T')[0];
    return new Date(s).toLocaleDateString();
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const { data: trip } = useQuery({
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
      setFormOpen(false);
      resetForm();
    },
    onError: (e) => showToast(e?.message || t('common.error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ expenseId, ...payload }) => travelService.updateExpense(id, expenseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses', id] });
      showToast(t('travel.budget.expenseUpdated', 'Expense updated'), 'success');
      setEditingExpense(null);
      resetForm();
    },
    onError: (e) => showToast(e?.message || t('common.error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId) => travelService.deleteExpense(id, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-expenses', id] });
      showToast(t('travel.budget.expenseDeleted', 'Expense deleted'), 'success');
      setDeleteTarget(null);
    },
    onError: (e) => showToast(e?.message || t('common.error'), 'error'),
  });

  function resetForm() {
    setCategory('food');
    setAmount('');
    setDescription('');
    setCurrency(trip?.budgetCurrency || 'EUR');
  }

  const openEdit = (item) => {
    setEditingExpense(item);
    setCategory(item.category || 'food');
    setAmount(String(item.amount ?? ''));
    setDescription(item.description || '');
    setCurrency(item.currency || 'EUR');
  };

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      showToast(t('validation.required', { field: 'Amount' }), 'error');
      return;
    }
    const payload = {
      category,
      amount: num,
      currency,
      amountInBaseCurrency: num,
      description: description.trim() || null,
      date: new Date().toISOString().split('T')[0],
    };
    if (editingExpense) {
      updateMutation.mutate({ expenseId: editingExpense.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const budgetLimit = Number(trip?.budget) || 0;
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.budget.title', 'Budget')}</Text>
      </View>

      {budgetLimit > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            {t('travel.budget.spent', 'Spent')} / {t('travel.budget.total', 'Total')}
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            €{totalSpent.toFixed(2)} / €{budgetLimit.toFixed(2)}
          </Text>
        </View>
      )}

      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>{t('travel.budget.noExpenses', 'No expenses yet')}</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
            onPress={() => openEdit(item)}
            onLongPress={() => setDeleteTarget(item)}
          >
            <View style={styles.cardRow}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.description || t(`travel.budget.categories.${item.category}`, item.category)}
              </Text>
              <Text style={[styles.cardAmount, { color: theme.colors.error }]}>
                -€{Number(item.amount || 0).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {t(`travel.budget.categories.${item.category}`, item.category)} • {formatDate(item.date)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => { setEditingExpense(null); resetForm(); setCurrency(trip?.budgetCurrency || 'EUR'); setFormOpen(true); }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        isOpen={formOpen || !!editingExpense}
        onClose={() => { setFormOpen(false); setEditingExpense(null); resetForm(); }}
        title={editingExpense ? t('travel.budget.editExpense', 'Edit expense') : t('travel.budget.addExpense', 'Add expense')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.budget.category', 'Category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {BUDGET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { borderColor: theme.colors.glassBorder, backgroundColor: category === cat ? theme.colors.primary + '20' : theme.colors.surfaceSecondary },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: category === cat ? theme.colors.primary : theme.colors.text }]}>
                    {t(`travel.budget.categories.${cat}`, cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.budget.amount', 'Amount')}</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textLight}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.budget.description', 'Description')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder={t('travel.budget.descriptionPlaceholder', 'Optional')}
              placeholderTextColor={theme.colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
            />
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
        title={t('travel.budget.deleteExpenseTitle', 'Delete expense?')}
        message={t('travel.budget.deleteExpenseMessage', 'This cannot be undone.')}
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
  summaryCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.h3, marginTop: 4 },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600', flex: 1 },
  cardAmount: { ...typography.body, fontWeight: '700' },
  cardSub: { ...typography.caption, marginTop: 4 },
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
  formLabel: { ...typography.label, marginBottom: spacing.xs },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: { ...typography.caption, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
});
