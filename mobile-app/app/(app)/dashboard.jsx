import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank, CreditCard, ShoppingCart,
  Bell, BarChart3, Calculator, Newspaper, Users, MapPin, Plus, MessageCircle,
  Eye, EyeOff, ChevronRight, Pencil, Trash2, Receipt, Repeat,
} from 'lucide-react-native';
import { analyticsService, budgetService, recurringBillService, transactionService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Modal, Button, ConfirmationModal, useToast } from '../../components';

function WidgetCard({ title, icon: Icon, children, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.widget, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.widgetHeader}>
        {Icon && <Icon size={18} color={theme.colors.primary} />}
        <Text style={[styles.widgetTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {children}
    </TouchableOpacity>
  );
}

const RECENT_PAGE_SIZE = 10;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = (dateStr + '').split('T')[0];
    return new Date(d).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const [refreshing, setRefreshing] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const user = authService.getCurrentUser();

  const { data: dashData, refetch } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsService.getDashboardAnalytics(),
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetService.getAll(),
  });

  const { data: upcomingBills } = useQuery({
    queryKey: ['upcoming-bills'],
    queryFn: () => recurringBillService.getUpcoming(7),
  });

  const { data: recentData, refetch: refetchRecent } = useQuery({
    queryKey: ['transactions', 'recent', 1, RECENT_PAGE_SIZE],
    queryFn: () => transactionService.getAll({ page: 1, pageSize: RECENT_PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
      showToast(t('transactions.deleteSuccess', 'Transaction deleted'), 'success');
      setDeleteTarget(null);
      setDetailTransaction(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchRecent()]);
    setRefreshing(false);
  }, [refetch, refetchRecent]);

  const summary = dashData || {};
  const totalExpenses = summary.totalExpenses || 0;
  const totalIncome = summary.totalIncome || 0;
  const balance = totalIncome - totalExpenses;

  const recentList = Array.isArray(recentData) ? recentData : recentData?.items ?? [];
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${Number(n).toFixed(2)}`);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header: greeting + privacy toggle */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
              {t('dashboard.welcome')}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={togglePrivacyMode}
            style={[styles.privacyBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
            accessibilityLabel={isPrivacyMode ? t('privacy.showNumbers', 'Show amounts') : t('privacy.hideNumbers', 'Hide amounts')}
          >
            {isPrivacyMode ? <EyeOff size={20} color={theme.colors.textSecondary} /> : <Eye size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Summary Cards (Paire: soft tints, theme-aware; respect privacy mode) */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.glassBorder }]}>
            <TrendingUp size={20} color={theme.colors.success} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>{formatAmount(totalIncome)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.income')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.error + '18', borderColor: theme.colors.glassBorder }]}>
            <TrendingDown size={20} color={theme.colors.error} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>{formatAmount(totalExpenses)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.expenses')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.glassBorder }]}>
            <Wallet size={20} color={theme.colors.primary} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>{formatAmount(balance)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.balance')}</Text>
          </View>
        </View>

        {/* Ask Paire – Financial Assistant */}
        <TouchableOpacity
          style={[styles.askPaireCard, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }, shadows.sm]}
          onPress={() => router.push('/(app)/chatbot')}
          activeOpacity={0.7}
        >
          <MessageCircle size={24} color={theme.colors.primary} />
          <Text style={[styles.askPaireTitle, { color: theme.colors.text }]}>{t('chatbot.title', 'Financial Assistant')}</Text>
          <Text style={[styles.askPaireSubtitle, { color: theme.colors.textSecondary }]}>{t('chatbot.placeholder', 'Ask me anything...')}</Text>
        </TouchableOpacity>

        {/* Quick Access Grid */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('dashboard.quickAccess')}</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: Plus, label: t('navigation.transactions'), route: '/(app)/transactions' },
            { icon: MapPin, label: t('travel.common.enterTravelMode', 'Travel Mode'), route: '/(app)/travel' },
            { icon: PiggyBank, label: t('navigation.savingsGoals'), route: '/(app)/savings-goals' },
            { icon: CreditCard, label: t('navigation.loans'), route: '/(app)/loans' },
            { icon: Receipt, label: t('receipts.title', 'Receipts'), route: '/(app)/receipts' },
            { icon: Repeat, label: t('navigation.recurringBills'), route: '/(app)/recurring-bills' },
            { icon: ShoppingCart, label: t('navigation.shoppingLists'), route: '/(app)/shopping-lists' },
            { icon: Bell, label: t('navigation.reminders'), route: '/(app)/reminders' },
            { icon: BarChart3, label: t('navigation.analytics'), route: '/(app)/analytics' },
            { icon: Calculator, label: t('navigation.currencyCalculator'), route: '/(app)/currency-calculator' },
            { icon: Newspaper, label: t('navigation.economicNews'), route: '/(app)/economic-news' },
            { icon: Users, label: t('navigation.partnership'), route: '/(app)/partnership' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
            >
              <item.icon size={22} color={theme.colors.primary} />
              <Text style={[styles.quickLabel, { color: theme.colors.text }]} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Budget Progress */}
        {budgets?.length > 0 && (
          <WidgetCard title={t('budgets.title')} icon={Wallet} theme={theme} onPress={() => router.push('/(app)/budgets')}>
            {budgets.slice(0, 3).map((b) => {
              const pct = b.amount > 0 ? Math.min((b.spentAmount / b.amount) * 100, 100) : 0;
              return (
                <View key={b.id} style={styles.budgetRow}>
                  <Text style={[styles.budgetName, { color: theme.colors.text }]}>{b.category}</Text>
                  <View style={[styles.progressBg, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 90 ? theme.colors.error : theme.colors.primary }]} />
                  </View>
                  <Text style={[styles.budgetPct, { color: theme.colors.textSecondary }]}>{pct.toFixed(0)}%</Text>
                </View>
              );
            })}
          </WidgetCard>
        )}

        {/* Upcoming Bills */}
        {upcomingBills?.length > 0 && (
          <WidgetCard title={t('recurringBills.upcoming')} icon={Bell} theme={theme} onPress={() => router.push('/(app)/recurring-bills')}>
            {upcomingBills.slice(0, 3).map((bill) => (
              <View key={bill.id} style={styles.billRow}>
                <Text style={[styles.billName, { color: theme.colors.text }]}>{bill.name}</Text>
                <Text style={[styles.billAmount, { color: theme.colors.primary }]}>{formatAmount(bill.amount)}</Text>
              </View>
            ))}
          </WidgetCard>
        )}

        {/* Recent Transactions */}
        <WidgetCard
          title={t('dashboard.recentTransactions', 'Recent transactions')}
          icon={Wallet}
          theme={theme}
          onPress={() => router.push('/(app)/transactions')}
        >
          {recentList.length === 0 ? (
            <Text style={[styles.recentEmpty, { color: theme.colors.textSecondary }]}>{t('common.noData', 'No data yet')}</Text>
          ) : (
            recentList.slice(0, 5).map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.recentRow, { borderBottomColor: theme.colors.glassBorder }]}
                  onPress={() => setDetailTransaction(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentRowLeft}>
                    <Text style={[styles.recentDesc, { color: theme.colors.text }]} numberOfLines={1}>{tx.description || tx.category || '—'}</Text>
                    <Text style={[styles.recentDate, { color: theme.colors.textSecondary }]}>{formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.recentAmount, { color: isExpense ? theme.colors.error : theme.colors.success }]}>
                    {isExpense ? '-' : '+'}{formatAmount(tx.amount)}
                  </Text>
                  <ChevronRight size={18} color={theme.colors.textLight} />
                </TouchableOpacity>
              );
            })
          )}
        </WidgetCard>
      </ScrollView>

      {/* Transaction detail modal */}
      <Modal
        isOpen={!!detailTransaction}
        onClose={() => { setDetailTransaction(null); setDeleteTarget(null); }}
        title={t('transactions.detail', 'Transaction details')}
      >
        {detailTransaction && (
          <View style={styles.detailBody}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('transactions.amount', 'Amount')}</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: detailTransaction.type === 'expense' ? theme.colors.error : theme.colors.success },
                ]}
              >
                {detailTransaction.type === 'expense' ? '-' : '+'}{formatAmount(detailTransaction.amount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('transactions.date', 'Date')}</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{formatDate(detailTransaction.date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('transactions.category', 'Category')}</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{detailTransaction.category || '—'}</Text>
            </View>
            {detailTransaction.notes && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('transactions.notes', 'Notes')}</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{detailTransaction.notes}</Text>
              </View>
            )}
            <View style={styles.detailActions}>
              <Button
                variant="secondary"
                title={t('common.edit')}
                onPress={() => { setDetailTransaction(null); router.push('/(app)/transactions'); }}
              />
              <Button
                variant="outline"
                title={t('common.delete')}
                onPress={() => {
                  setDeleteTarget(detailTransaction);
                  setDetailTransaction(null);
                }}
                textStyle={{ color: theme.colors.error }}
              />
            </View>
          </View>
        )}
      </Modal>

      {/* Delete transaction confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('transactions.deleteConfirmTitle', 'Delete transaction?')}
        message={t('transactions.deleteConfirmMessage', 'This cannot be undone.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  greeting: { ...typography.bodySmall },
  userName: { ...typography.h2 },
  privacyBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  summaryAmount: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 11 },
  askPaireCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  askPaireTitle: { flex: 1, ...typography.label },
  askPaireSubtitle: { ...typography.bodySmall },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  quickItem: {
    width: '23%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  quickLabel: { fontSize: 10, textAlign: 'center' },
  widget: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  widgetTitle: { ...typography.label },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  budgetName: { flex: 1, fontSize: 13 },
  progressBg: { flex: 2, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetPct: { width: 35, textAlign: 'right', fontSize: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  billName: { fontSize: 14 },
  billAmount: { fontSize: 14, fontWeight: '600' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  recentRowLeft: { flex: 1 },
  recentDesc: { ...typography.body, fontWeight: '500' },
  recentDate: { ...typography.caption, marginTop: 2 },
  recentAmount: { fontSize: 14, fontWeight: '600' },
  recentEmpty: { ...typography.bodySmall, paddingVertical: spacing.sm },
  detailBody: { paddingVertical: spacing.sm },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.body, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
