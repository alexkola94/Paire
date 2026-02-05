/**
 * Analytics Screen (React Native)
 *
 * Based on frontend Analytics.jsx: date range, view filter (solo/together/partner),
 * summary cards (income, expenses, net balance, avg daily), category breakdown,
 * loan summary, partner comparison. Theme-aware; respects privacy mode.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  PieChart,
  CreditCard,
  Users,
} from 'lucide-react-native';
import {
  analyticsService,
  transactionService,
  partnershipService,
} from '../../services/api';
import { getStoredUser } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import {
  ScreenHeader,
  EmptyState,
  ScreenLoading,
  Dropdown,
  AddToCalculatorButton,
  useToast,
} from '../../components';

// ---- Date range helpers (match frontend) ----
function getDateRangeByKey(dateRangeKey) {
  const end = new Date();
  let start;

  switch (dateRangeKey) {
    case 'week':
      start = subDays(end, 7);
      break;
    case 'month':
      start = startOfMonth(end);
      break;
    case 'lastMonth':
      start = startOfMonth(subMonths(end, 1));
      return {
        start: start.toISOString(),
        end: endOfMonth(subMonths(end, 1)).toISOString(),
      };
    case 'last3Months':
      start = subMonths(end, 3);
      break;
    case 'last6Months':
      start = subMonths(end, 6);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case 'lastYear':
      start = new Date(end.getFullYear() - 1, 0, 1);
      return {
        start: start.toISOString(),
        end: new Date(end.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString(),
      };
    case 'all':
      start = new Date(2000, 0, 1);
      break;
    default:
      start = startOfMonth(end);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

// Filter transactions by view (solo / together / partnerId)
function filterTransactions(transactions, viewFilter, currentUser) {
  if (!transactions?.length || !currentUser) return transactions || [];
  const currentUserId = String(currentUser.id);
  const currentUserEmail = (currentUser.email || '').toLowerCase();

  return transactions.filter((tx) => {
    const txUserId = tx.user_id ?? tx.userId;
    const txUserIdStr = txUserId != null ? String(txUserId) : '';
    const isMe =
      txUserIdStr === currentUserId ||
      ((tx.user_profiles?.email ?? tx.userProfiles?.email ?? '')
        .toLowerCase() === currentUserEmail &&
        !txUserId);

    if (viewFilter === 'solo') return isMe;
    if (viewFilter === 'together') return true;
    return txUserIdStr === viewFilter;
  });
}

// Compute analytics from filtered transactions (match frontend)
function calculateAnalyticsFromTransactions(transactions, range) {
  if (!transactions?.length) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      averageDailySpending: 0,
      categoryBreakdown: [],
    };
  }
  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income');
  const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const start = new Date(range.start);
  const end = new Date(range.end);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const averageDailySpending = totalExpenses / days;

  const categoryMap = {};
  expenses.forEach((e) => {
    const cat = (e.category || 'other').toLowerCase();
    categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0);
  });
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpenses,
    balance,
    averageDailySpending,
    categoryBreakdown,
  };
}

const formatAmount = (value, isPrivate) => {
  if (value == null) return '—';
  if (isPrivate) return '••••••';
  return `€${Number(value).toFixed(2)}`;
};

// Date range options for dropdown
const DATE_RANGE_OPTIONS = [
  { value: 'week', labelKey: 'analytics.lastWeek' },
  { value: 'month', labelKey: 'analytics.thisMonth' },
  { value: 'lastMonth', labelKey: 'analytics.lastMonth' },
  { value: 'last3Months', labelKey: 'analytics.last3Months' },
  { value: 'last6Months', labelKey: 'analytics.last6Months' },
  { value: 'year', labelKey: 'analytics.thisYear' },
  { value: 'lastYear', labelKey: 'analytics.lastYear' },
  { value: 'all', labelKey: 'analytics.allTime' },
];

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const [dateRangeKey, setDateRangeKey] = useState('month');
  const [viewFilter, setViewFilter] = useState('together');
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = getStoredUser();

  const range = useMemo(
    () => getDateRangeByKey(dateRangeKey),
    [dateRangeKey]
  );

  // Partner options for view filter
  const { data: partnerships } = useQuery({
    queryKey: ['partnerships'],
    queryFn: () => partnershipService.getMyPartnerships(),
  });
  const viewFilterOptions = useMemo(() => {
    const options = [
      { value: 'together', label: t('analytics.together') },
      { value: 'solo', label: t('analytics.solo') },
    ];
    const list = Array.isArray(partnerships) ? partnerships : [];
    list.forEach((p) => {
      const isUser1 = p.user1_id === currentUser?.id;
      const partner = isUser1 ? p.user2 : p.user1;
      if (partner) {
        options.push({
          value: String(partner.id),
          label: partner.display_name || partner.email || t('analytics.partner'),
        });
      }
    });
    return options;
  }, [partnerships, currentUser?.id, t]);

  // Load analytics: fetch transactions, filter, compute; plus loans and comparative
  const {
    data: analyticsData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['analytics-full', range.start, range.end, viewFilter],
    queryFn: async () => {
      let analytics = null;
      try {
        const raw = await transactionService.getAll({
          startDate: range.start,
          endDate: range.end,
          pageSize: 2000,
        });
        const transactions = Array.isArray(raw) ? raw : raw?.items ?? [];
        const filtered = filterTransactions(transactions, viewFilter, currentUser);
        analytics = calculateAnalyticsFromTransactions(filtered, range);
      } catch {
        try {
          const financial = await analyticsService.getFinancialAnalytics(
            range.start,
            range.end
          );
          analytics = {
            totalIncome: financial?.totalIncome ?? financial?.total_income ?? 0,
            totalExpenses: financial?.totalExpenses ?? financial?.total_expenses ?? 0,
            balance:
              (financial?.totalIncome ?? financial?.total_income ?? 0) -
              (financial?.totalExpenses ?? financial?.total_expenses ?? 0),
            averageDailySpending:
              financial?.avgDailySpending ?? financial?.avg_daily_spending ?? 0,
            categoryBreakdown: financial?.categoryBreakdown ?? financial?.category_breakdown ?? [],
          };
        } catch {
          analytics = {
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            averageDailySpending: 0,
            categoryBreakdown: [],
          };
        }
      }

      let loanAnalytics = null;
      let comparativeAnalytics = null;
      try {
        loanAnalytics = await analyticsService.getLoanAnalytics(range.start, range.end);
      } catch {}
      try {
        comparativeAnalytics = await analyticsService.getComparativeAnalytics(
          range.start,
          range.end
        );
      } catch {}

      return { analytics, loanAnalytics, comparativeAnalytics };
    },
    enabled: !!currentUser,
  });

  const { analytics, loanAnalytics, comparativeAnalytics } = analyticsData || {};
  const hasData =
    analytics &&
    (analytics.totalIncome !== 0 ||
      analytics.totalExpenses !== 0 ||
      (analytics.categoryBreakdown?.length ?? 0) > 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !analyticsData) {
    return <ScreenLoading message={t('common.loading', 'Loading...')} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ScreenHeader title={t('analytics.title', 'Analytics')} onBack={() => router.back()} />

      {/* Filters row */}
      <View style={[styles.filtersRow, { borderBottomColor: theme.colors.glassBorder }]}>
        <Dropdown
          options={DATE_RANGE_OPTIONS.map((o) => ({
            value: o.value,
            label: t(o.labelKey),
          }))}
          value={dateRangeKey}
          onChange={setDateRangeKey}
          style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
        />
        <Dropdown
          options={viewFilterOptions}
          value={viewFilter}
          onChange={setViewFilter}
          style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title={t('analytics.noCategoryData', 'No category data available')}
            description={t(
              'analytics.noCategoryDataDescription',
              'Add expenses to see spending breakdown by category'
            )}
          />
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              {t('analytics.subtitle', 'Financial insights and trends')}
            </Text>

            {/* Summary cards */}
            <View style={styles.cardsRow}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                ]}
              >
                <TrendingUp size={22} color={theme.colors.success} />
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.totalIncome')}
                </Text>
                <View style={styles.cardValueRow}>
                  <Text style={[styles.cardValue, { color: theme.colors.text }]}>
                    {formatAmount(analytics.totalIncome, isPrivate)}
                  </Text>
                  <AddToCalculatorButton
                    value={analytics.totalIncome}
                    isPrivate={isPrivate}
                    size={16}
                    onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                ]}
              >
                <TrendingDown size={22} color={theme.colors.error} />
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.totalExpenses')}
                </Text>
                <View style={styles.cardValueRow}>
                  <Text style={[styles.cardValue, { color: theme.colors.text }]}>
                    {formatAmount(analytics.totalExpenses, isPrivate)}
                  </Text>
                  <AddToCalculatorButton
                    value={analytics.totalExpenses}
                    isPrivate={isPrivate}
                    size={16}
                    onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                  />
                </View>
              </View>
            </View>
            <View style={styles.cardsRow}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                ]}
              >
                <Wallet size={22} color={theme.colors.primary} />
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.netBalance')}
                </Text>
                <View style={styles.cardValueRow}>
                  <Text
                    style={[
                      styles.cardValue,
                      {
                        color:
                          (analytics.balance ?? 0) >= 0
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {formatAmount(analytics.balance, isPrivate)}
                  </Text>
                  <AddToCalculatorButton
                    value={analytics.balance}
                    isPrivate={isPrivate}
                    size={16}
                    onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                ]}
              >
                <BarChart3 size={22} color={theme.colors.primary} />
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.avgDailySpending')}
                </Text>
                <View style={styles.cardValueRow}>
                  <Text style={[styles.cardValue, { color: theme.colors.text }]}>
                    {formatAmount(analytics.averageDailySpending, isPrivate)}
                  </Text>
                  <AddToCalculatorButton
                    value={analytics.averageDailySpending}
                    isPrivate={isPrivate}
                    size={16}
                    onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                  />
                </View>
              </View>
            </View>

            {/* Category breakdown */}
            {analytics.categoryBreakdown?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <PieChart size={18} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('analytics.categoryBreakdown')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.categoryList,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                  ]}
                >
                  {analytics.categoryBreakdown.map((cat, idx) => (
                    <View
                      key={cat.category}
                      style={[styles.categoryRow, { borderBottomColor: theme.colors.glassBorder }]}
                    >
                      <Text
                        style={[styles.categoryName, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {t(`categories.${cat.category}`, cat.category)}
                      </Text>
                      <View style={styles.categoryAmountRow}>
                        <Text style={[styles.categoryAmount, { color: theme.colors.textSecondary }]}>
                          {formatAmount(cat.amount, isPrivate)}{' '}
                          <Text style={styles.categoryPct}>({cat.percentage?.toFixed(1)}%)</Text>
                        </Text>
                        <AddToCalculatorButton
                          value={cat.amount}
                          isPrivate={isPrivate}
                          size={16}
                          onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Loan summary */}
            {loanAnalytics && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <CreditCard size={18} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('analytics.loanSummary')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.loanGrid,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                  ]}
                >
                  <View style={styles.loanRow}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.loansGiven')}
                    </Text>
                    <View style={styles.loanValueRow}>
                      <Text style={[styles.loanValue, { color: theme.colors.text }]}>
                        {formatAmount(
                          loanAnalytics.totalLoansGiven ?? loanAnalytics.total_loans_given,
                          isPrivate
                        )}
                      </Text>
                      <AddToCalculatorButton
                        value={loanAnalytics.totalLoansGiven ?? loanAnalytics.total_loans_given}
                        isPrivate={isPrivate}
                        size={16}
                        onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                      />
                    </View>
                  </View>
                  <View style={styles.loanRow}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.loansReceived')}
                    </Text>
                    <View style={styles.loanValueRow}>
                      <Text style={[styles.loanValue, { color: theme.colors.text }]}>
                        {formatAmount(
                          loanAnalytics.totalLoansReceived ?? loanAnalytics.total_loans_received,
                          isPrivate
                        )}
                      </Text>
                      <AddToCalculatorButton
                        value={loanAnalytics.totalLoansReceived ?? loanAnalytics.total_loans_received}
                        isPrivate={isPrivate}
                        size={16}
                        onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                      />
                    </View>
                  </View>
                  <View style={styles.loanRow}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.paidBack')}
                    </Text>
                    <View style={styles.loanValueRow}>
                      <Text
                        style={[
                          styles.loanValue,
                          { color: theme.colors.success },
                        ]}
                      >
                        {formatAmount(
                          loanAnalytics.totalPaidBack ?? loanAnalytics.total_paid_back,
                          isPrivate
                        )}
                      </Text>
                      <AddToCalculatorButton
                        value={loanAnalytics.totalPaidBack ?? loanAnalytics.total_paid_back}
                        isPrivate={isPrivate}
                        size={16}
                        onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                      />
                    </View>
                  </View>
                  <View style={styles.loanRow}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.outstanding')}
                    </Text>
                    <View style={styles.loanValueRow}>
                      <Text
                        style={[styles.loanValue, { color: theme.colors.error }]}
                      >
                        {formatAmount(
                          loanAnalytics.totalOutstanding ?? loanAnalytics.total_outstanding,
                          isPrivate
                        )}
                      </Text>
                      <AddToCalculatorButton
                        value={loanAnalytics.totalOutstanding ?? loanAnalytics.total_outstanding}
                        isPrivate={isPrivate}
                        size={16}
                        onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Partner comparison */}
            {comparativeAnalytics?.partnerComparison?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Users size={18} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('analytics.partnerComparison')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.partnerList,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                  ]}
                >
                  {comparativeAnalytics.partnerComparison.map((p, idx) => (
                    <View
                      key={idx}
                      style={[styles.partnerRow, { borderBottomColor: theme.colors.glassBorder }]}
                    >
                      <Text style={[styles.partnerName, { color: theme.colors.text }]}>
                        {p.partner ?? t('analytics.partner')}
                      </Text>
                      <View style={styles.partnerAmountRow}>
                        <Text style={[styles.partnerAmount, { color: theme.colors.textSecondary }]}>
                          {formatAmount(p.totalSpent ?? p.total_spent, isPrivate)} (
                          {(p.percentage ?? 0).toFixed(1)}%) · {p.transactionCount ?? 0}{' '}
                          {t('analytics.transactions')}
                        </Text>
                        <AddToCalculatorButton
                          value={p.totalSpent ?? p.total_spent}
                          isPrivate={isPrivate}
                          size={16}
                          onAdded={() => showToast(t('calculator.added'), 'success', 1500)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdown: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 44,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  sectionLabel: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardLabel: { ...typography.caption },
  cardValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardValue: { ...typography.h2, fontSize: 15 },
  section: { marginTop: spacing.lg },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.label },
  categoryList: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryName: { ...typography.body, flex: 1 },
  categoryAmountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  categoryAmount: { ...typography.body },
  categoryPct: { fontSize: 12, opacity: 0.8 },
  loanGrid: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  loanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  loanLabel: { ...typography.body },
  loanValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loanValue: { ...typography.body, fontWeight: '600' },
  partnerList: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  partnerRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  partnerName: { ...typography.body, fontWeight: '600' },
  partnerAmountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  partnerAmount: { ...typography.bodySmall },
});
