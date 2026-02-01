import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, TrendingDown, TrendingUp, PiggyBank, CreditCard, ShoppingCart,
  Bell, Trophy, BarChart3, Calculator, Newspaper, Users, MapPin, Plus,
} from 'lucide-react-native';
import { analyticsService, budgetService, savingsGoalService, recurringBillService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

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

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const summary = dashData || {};
  const totalExpenses = summary.totalExpenses || 0;
  const totalIncome = summary.totalIncome || 0;
  const balance = totalIncome - totalExpenses;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
              {t('dashboard.welcome')}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
        </View>

        {/* Summary Cards (Paire: soft tints, theme-aware) */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.glassBorder }]}>
            <TrendingUp size={20} color={theme.colors.success} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>€{totalIncome.toFixed(2)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.income')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.error + '18', borderColor: theme.colors.glassBorder }]}>
            <TrendingDown size={20} color={theme.colors.error} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>€{totalExpenses.toFixed(2)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.expenses')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.glassBorder }]}>
            <Wallet size={20} color={theme.colors.primary} />
            <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>€{balance.toFixed(2)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('dashboard.balance')}</Text>
          </View>
        </View>

        {/* Quick Access Grid */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('dashboard.quickAccess')}</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: Plus, label: t('navigation.transactions'), route: '/(app)/transactions' },
            { icon: MapPin, label: t('travel.common.enterTravelMode', 'Travel Mode'), route: '/(app)/travel' },
            { icon: PiggyBank, label: t('navigation.savingsGoals'), route: '/(app)/savings-goals' },
            { icon: CreditCard, label: t('navigation.loans'), route: '/(app)/loans' },
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
                <Text style={[styles.billAmount, { color: theme.colors.primary }]}>€{bill.amount?.toFixed(2)}</Text>
              </View>
            ))}
          </WidgetCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  header: { marginBottom: spacing.lg },
  greeting: { ...typography.bodySmall },
  userName: { ...typography.h2 },
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
});
