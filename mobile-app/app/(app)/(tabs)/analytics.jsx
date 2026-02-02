/**
 * Analytics Screen (React Native)
 * Summary cards, category breakdown, and optional monthly comparison.
 * Uses transactionService.getAll() and computes analytics client-side;
 * optional analyticsService.getLoanAnalytics() for loan summary.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideInLeft, useReducedMotion } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  Calendar,
  Menu,
} from 'lucide-react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { transactionService, analyticsService, partnershipService } from '../../../services/api';
import { getStoredUser } from '../../../services/auth';
import { useTheme } from '../../../context/ThemeContext';
import { usePrivacyMode } from '../../../context/PrivacyModeContext';
import { useTabTransition } from '../../../context/TabTransitionContext';
import { spacing, borderRadius, typography, shadows, colors } from '../../../constants/theme';
import { Dropdown } from '../../../components';
import { useScrollToTop } from '../../../context/ScrollToTopContext';
import { subDays } from 'date-fns';

// Simple currency formatter; respects privacy mode when passed
const formatCurrency = (n, isPrivate = false) => {
  if (isPrivate) return '••••';
  if (n == null) return '€0.00';
  return `€${Number(n).toFixed(2)}`;
};

/**
 * Returns { start, end } ISO strings for the given range key
 */
function getDateRange(dateRange) {
  const end = new Date();
  let start;

  switch (dateRange) {
    case 'week':
      start = subDays(end, 7);
      break;
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'lastMonth':
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      return {
        start: start.toISOString(),
        end: new Date(end.getFullYear(), end.getMonth(), 0, 23, 59, 59).toISOString(),
      };
    case 'last3Months':
      start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate());
      break;
    case 'last6Months':
      start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());
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
      start = new Date(end.getFullYear(), end.getMonth(), 1);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Filter transactions by view (solo / together / partnerId)
 */
function filterTransactions(transactions, viewFilter, currentUserId) {
  if (!transactions?.length) return [];
  const currentUserIdStr = String(currentUserId);

  return transactions.filter((tx) => {
    const txUserId = tx.user_id ?? tx.userId;
    const txUserIdStr = txUserId != null ? String(txUserId) : null;
    const isMe = txUserIdStr === currentUserIdStr;

    if (viewFilter === 'solo') return isMe;
    if (viewFilter === 'together') return true;
    if (viewFilter !== 'solo' && viewFilter !== 'together') return txUserIdStr === String(viewFilter);
    return true;
  });
}

/**
 * Compute analytics from transaction list (same shape as frontend)
 */
function calculateAnalytics(transactions, range) {
  if (!transactions?.length) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      averageDailySpending: 0,
      categoryBreakdown: [],
      monthlyComparison: [],
    };
  }

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income');
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const averageDailySpending = totalExpenses / daysDiff;

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

  const monthlyMap = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthKey: key,
        income: 0,
        expenses: 0,
      };
    }
    if (t.type === 'income') monthlyMap[key].income += t.amount || 0;
    else if (t.type === 'expense') monthlyMap[key].expenses += t.amount || 0;
  });
  const monthlyComparison = Object.values(monthlyMap)
    .map((m) => ({ ...m, balance: m.income - m.expenses }))
    .sort((a, b) => (a.monthKey > b.monthKey ? -1 : 1));

  return {
    totalIncome,
    totalExpenses,
    balance,
    averageDailySpending,
    categoryBreakdown,
    monthlyComparison,
  };
}

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

const CATEGORY_COLORS = [
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#6366F1',
];

const TAB_INDEX = 2; // Analytics is third tab
const ANALYTICS_ROUTE = '/(app)/(tabs)/analytics';

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  const { registerTabIndex, previousTabIndex, currentTabIndex } = useTabTransition();
  const { width } = useWindowDimensions();
  const [dateRange, setDateRange] = useState('month');
  const scrollViewRef = useRef(null);
  const { register } = useScrollToTop();

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    const unregister = register(ANALYTICS_ROUTE, scrollToTop);
    return unregister;
  }, [register, scrollToTop]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', scrollToTop);
    return unsubscribe;
  }, [navigation, scrollToTop]);

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
  const [viewFilter, setViewFilter] = useState('together');
  const [refreshing, setRefreshing] = useState(false);
  
  // Responsive: use row layout on tablets (width >= 600)
  const isTablet = width >= 600;

  const range = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Partnerships for view filter (solo / together / partner)
  const { data: partnershipsData } = useQuery({
    queryKey: ['partnerships'],
    queryFn: () => partnershipService.getMyPartnerships(),
  });

  const partnerOptions = useMemo(() => {
    const base = [
      { value: 'together', label: t('analytics.together') },
      { value: 'solo', label: t('analytics.solo') },
    ];
    const currentUser = getStoredUser();
    const list = partnershipsData ?? [];
    list.forEach((p) => {
      const isUser1 = p.user1_id === currentUser?.id;
      const partner = isUser1 ? p.user2 : p.user1;
      if (partner) {
        base.push({
          value: partner.id,
          label: list.length === 1 ? t('analytics.partner') : (partner.display_name || partner.email),
        });
      }
    });
    return base;
  }, [partnershipsData, t]);

  // Transactions for the selected range
  const { data: transactions = [], refetch: refetchTx, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions-analytics', range.start, range.end],
    queryFn: () => transactionService.getAll({ startDate: range.start, endDate: range.end }),
  });

  // Loan analytics (optional)
  const { data: loanAnalytics } = useQuery({
    queryKey: ['analytics-loans', range.start, range.end],
    queryFn: () => analyticsService.getLoanAnalytics(range.start, range.end),
  });

  const currentUser = getStoredUser();
  const filteredTx = useMemo(
    () => filterTransactions(transactions, viewFilter, currentUser?.id),
    [transactions, viewFilter, currentUser?.id]
  );

  const analytics = useMemo(
    () => calculateAnalytics(filteredTx, range),
    [filteredTx, range]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchTx();
    setRefreshing(false);
  };

  const dateOptions = useMemo(
    () => DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t]
  );

  const isLoading = loadingTx;

  return (
    <Animated.View entering={entering} style={[styles.tabTransitionWrapper, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header: menu + title */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={[styles.headerMenuBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
            accessibilityLabel={t('common.menu', 'Menu')}
          >
            <Menu size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('analytics.title')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('analytics.subtitle')}
            </Text>
          </View>
        </View>

        {/* Filters - responsive layout: column on mobile, row on tablet */}
        <View style={[styles.filters, isTablet && styles.filtersRow]}>
          <Dropdown
            options={dateOptions}
            value={dateRange}
            onChange={setDateRange}
            icon={Calendar}
            placeholder={t('analytics.thisMonth')}
            style={isTablet && { flex: 1 }}
          />
          <Dropdown
            options={partnerOptions}
            value={viewFilter}
            onChange={setViewFilter}
            placeholder={t('analytics.together')}
            style={isTablet && { flex: 1 }}
          />
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              {t('common.loading', 'Loading...')}
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.cards}>
              <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={[styles.cardIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <TrendingUp size={24} color="#10B981" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.totalIncome')}
                </Text>
                <Text style={[styles.cardAmount, { color: theme.colors.text }]}>
                  {formatCurrency(analytics.totalIncome, isPrivacyMode)}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={[styles.cardIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <TrendingDown size={24} color="#EF4444" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.totalExpenses')}
                </Text>
                <Text style={[styles.cardAmount, { color: theme.colors.text }]}>
                  {formatCurrency(analytics.totalExpenses, isPrivacyMode)}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={[styles.cardIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={styles.cardIconText}>€</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.netBalance')}
                </Text>
                <Text
                  style={[
                    styles.cardAmount,
                    { color: analytics.balance >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {formatCurrency(analytics.balance, isPrivacyMode)}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={[styles.cardIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Activity size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                  {t('analytics.avgDailySpending')}
                </Text>
                <Text style={[styles.cardAmount, { color: theme.colors.text }]}>
                  {formatCurrency(analytics.averageDailySpending, isPrivacyMode)}
                </Text>
              </View>
            </View>

            {/* Category breakdown */}
            <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <View style={styles.sectionHeader}>
                <PieChart size={22} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('analytics.categoryBreakdown')}
                </Text>
              </View>
              {analytics.categoryBreakdown.length > 0 ? (
                analytics.categoryBreakdown.map((cat, index) => (
                  <View key={cat.category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] },
                        ]}
                      />
                      <Text style={[styles.categoryName, { color: theme.colors.text }]} numberOfLines={1}>
                        {t(`categories.${cat.category}`) || cat.category}
                      </Text>
                    </View>
                    <View style={styles.categoryBarWrap}>
                      <View
                        style={[
                          styles.categoryBarBg,
                          { backgroundColor: theme.colors.surfaceSecondary },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryBarFill,
                            {
                              width: `${Math.min(100, cat.percentage)}%`,
                              backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.categoryAmount, { color: theme.colors.textSecondary }]}>
                      {formatCurrency(cat.amount, isPrivacyMode)} ({cat.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <PieChart size={48} color={theme.colors.textLight} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    {t('analytics.noCategoryData')}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
                    {t('analytics.noCategoryDataDescription')}
                  </Text>
                </View>
              )}
            </View>

            {/* Loan summary (optional) */}
            {loanAnalytics && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={styles.sectionHeader}>
                  <BarChart3 size={22} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('analytics.loanSummary')}
                  </Text>
                </View>
                <View style={styles.loanGrid}>
                  <View style={styles.loanStat}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.loansGiven')}
                    </Text>
                    <Text style={[styles.loanValue, { color: theme.colors.text }]}>
                      {formatCurrency(loanAnalytics.totalLoansGiven, isPrivacyMode)}
                    </Text>
                  </View>
                  <View style={styles.loanStat}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.loansReceived')}
                    </Text>
                    <Text style={[styles.loanValue, { color: theme.colors.text }]}>
                      {formatCurrency(loanAnalytics.totalLoansReceived, isPrivacyMode)}
                    </Text>
                  </View>
                  <View style={styles.loanStat}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.paidBack')}
                    </Text>
                    <Text style={[styles.loanValue, { color: '#10B981' }]}>
                      {formatCurrency(loanAnalytics.totalPaidBack, isPrivacyMode)}
                    </Text>
                  </View>
                  <View style={styles.loanStat}>
                    <Text style={[styles.loanLabel, { color: theme.colors.textSecondary }]}>
                      {t('analytics.outstanding')}
                    </Text>
                    <Text style={[styles.loanValue, { color: '#EF4444' }]}>
                      {formatCurrency(loanAnalytics.totalOutstanding, isPrivacyMode)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Monthly comparison */}
            {analytics.monthlyComparison.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <View style={styles.sectionHeader}>
                  <Calendar size={22} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('analytics.monthlyComparison')}
                  </Text>
                </View>
                {analytics.monthlyComparison.slice(0, 6).map((m) => (
                  <View key={m.monthKey} style={[styles.monthRow, { borderBottomColor: theme.colors.surfaceSecondary }]}>
                    <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
                      {m.month} {m.year}
                    </Text>
                    <View style={styles.monthValues}>
                      <Text style={[styles.monthVal, { color: '#10B981' }]}>
                        {formatCurrency(m.income, isPrivacyMode)}
                      </Text>
                      <Text style={[styles.monthVal, { color: '#EF4444' }]}>
                        {formatCurrency(m.expenses, isPrivacyMode)}
                      </Text>
                      <Text
                        style={[
                          styles.monthVal,
                          { color: m.balance >= 0 ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {formatCurrency(m.balance, isPrivacyMode)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabTransitionWrapper: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerMenuBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall },
  filters: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  // Row layout for filters on wider screens (tablets)
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { ...typography.body, marginTop: spacing.md },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    width: '48%',
    minWidth: 140,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardIconText: { fontSize: 20, fontWeight: '700' },
  cardLabel: { ...typography.caption, marginBottom: 2 },
  cardAmount: { ...typography.h3 },
  section: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3 },
  categoryRow: {
    marginBottom: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  categoryName: { ...typography.bodySmall, flex: 1 },
  categoryBarWrap: { marginBottom: 2 },
  categoryBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryAmount: { ...typography.caption },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptyDesc: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center' },
  loanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loanStat: {
    width: '47%',
    paddingVertical: spacing.sm,
  },
  loanLabel: { ...typography.caption, marginBottom: 2 },
  loanValue: { ...typography.body, fontWeight: '600' },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  monthLabel: { ...typography.bodySmall },
  monthValues: { flexDirection: 'row', gap: spacing.md },
  monthVal: { ...typography.bodySmall, fontWeight: '600' },
});
