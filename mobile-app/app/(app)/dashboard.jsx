import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideInLeft, useReducedMotion } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank, CreditCard, ShoppingCart,
  Bell, BarChart3, Calculator, Newspaper, Users, MapPin, Plus, MessageCircle,
  Eye, EyeOff, ChevronRight, Pencil, Trash2, Receipt, Repeat, Settings,
} from 'lucide-react-native';
import { analyticsService, budgetService, recurringBillService, transactionService, savingsGoalService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { useDashboardLayout } from '../../context/DashboardLayoutContext';
import { useTabTransition } from '../../context/TabTransitionContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { 
  Modal, Button, ConfirmationModal, ScreenLoading, useToast, WidgetSelector,
  SummaryWidget, BudgetWidget, UpcomingBillsWidget, RecentTransactionsWidget,
  SavingsWidget, QuickAccessWidget,
} from '../../components';

const RECENT_PAGE_SIZE = 10;
const TAB_INDEX = 0; // Dashboard is first tab

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
  const { layout, saveLayout, isWidgetVisible } = useDashboardLayout();
  const { registerTabIndex, previousTabIndex, currentTabIndex } = useTabTransition();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      registerTabIndex(TAB_INDEX);
    }, [registerTabIndex])
  );

  const reducedMotion = useReducedMotion();
  const entering = useMemo(() => {
    if (reducedMotion) return FadeIn.duration(0);
    if (previousTabIndex === null) return FadeIn.duration(200);
    return (currentTabIndex > previousTabIndex ? SlideInRight : SlideInLeft).duration(280);
  }, [previousTabIndex, currentTabIndex, reducedMotion]);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const user = authService.getCurrentUser();

  const { data: dashData, refetch, isLoading: dashLoading } = useQuery({
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

  const { data: savingsGoals } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => savingsGoalService.getAll(),
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

  // Show loading until primary dashboard data is ready (avoids empty/zero widgets flash)
  if (dashLoading && (dashData === undefined || dashData === null)) {
    return <ScreenLoading />;
  }

  return (
    <Animated.View entering={entering} style={[styles.tabTransitionWrapper, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header: greeting + privacy toggle + customize */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
              {t('dashboard.welcome')}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setWidgetSelectorOpen(true)}
              style={[styles.headerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
              accessibilityLabel={t('widgets.customize', 'Customize Dashboard')}
            >
              <Settings size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={togglePrivacyMode}
              style={[styles.headerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
              accessibilityLabel={isPrivacyMode ? t('privacy.showNumbers', 'Show amounts') : t('privacy.hideNumbers', 'Hide amounts')}
            >
              {isPrivacyMode ? <EyeOff size={18} color={theme.colors.textSecondary} /> : <Eye size={18} color={theme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Widget */}
        {isWidgetVisible('summary') && (
          <View style={{ marginBottom: spacing.lg }}>
            <SummaryWidget totalIncome={totalIncome} totalExpenses={totalExpenses} />
          </View>
        )}

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

        {/* Quick Access Widget */}
        {isWidgetVisible('quickAccess') && (
          <QuickAccessWidget onItemPress={(route) => router.push(route)} />
        )}

        {/* Budget Progress Widget */}
        {isWidgetVisible('budgets') && budgets?.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <BudgetWidget 
              budgets={budgets} 
              onPress={() => router.push('/(app)/budgets')} 
            />
          </View>
        )}

        {/* Upcoming Bills Widget */}
        {isWidgetVisible('upcomingBills') && upcomingBills?.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <UpcomingBillsWidget 
              bills={upcomingBills} 
              onPress={() => router.push('/(app)/recurring-bills')} 
            />
          </View>
        )}

        {/* Recent Transactions Widget */}
        {isWidgetVisible('recentTransactions') && (
          <View style={{ marginBottom: spacing.md }}>
            <RecentTransactionsWidget
              transactions={recentList}
              onPress={() => router.push('/(app)/transactions')}
              onTransactionPress={(tx) => setDetailTransaction(tx)}
            />
          </View>
        )}

        {/* Savings Goals Widget */}
        {isWidgetVisible('savings') && savingsGoals?.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <SavingsWidget 
              goals={savingsGoals} 
              onPress={() => router.push('/(app)/savings-goals')} 
            />
          </View>
        )}
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

      {/* Widget Selector Modal */}
      <WidgetSelector
        isOpen={widgetSelectorOpen}
        onClose={() => setWidgetSelectorOpen(false)}
        layout={layout}
        onSave={saveLayout}
      />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabTransitionWrapper: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.tabBarBottomClearance },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  greeting: { ...typography.bodySmall },
  userName: { ...typography.h2 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  detailBody: { paddingVertical: spacing.sm },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.body, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
