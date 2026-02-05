/**
 * InsightsWidget Component
 *
 * Displays proactive financial insights on the dashboard:
 * - Spending comparisons (this month vs last month)
 * - Savings projections
 * - Upcoming bills summary
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb, TrendingUp, TrendingDown, CalendarClock, PiggyBank, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import AnimatedCard from '../AnimatedCard';

/**
 * Calculate spending insights from transactions
 */
function calculateInsights(transactions, budgets, bills, savingsGoals, t) {
  const insights = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  // Group transactions by month and category
  const thisMonthExpenses = {};
  const lastMonthExpenses = {};
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  (transactions || []).forEach((tx) => {
    if (tx.type?.toLowerCase() !== 'expense') return;
    const date = new Date(tx.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const amount = Number(tx.amount) || 0;
    const category = tx.category || 'other';

    if (month === thisMonth && year === thisYear) {
      thisMonthExpenses[category] = (thisMonthExpenses[category] || 0) + amount;
      thisMonthTotal += amount;
    } else if (month === lastMonth && year === lastMonthYear) {
      lastMonthExpenses[category] = (lastMonthExpenses[category] || 0) + amount;
      lastMonthTotal += amount;
    }
  });

  // 1. Overall spending comparison
  if (lastMonthTotal > 0) {
    const pctChange = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    if (Math.abs(pctChange) >= 10) {
      insights.push({
        type: pctChange > 0 ? 'warning' : 'success',
        icon: pctChange > 0 ? TrendingUp : TrendingDown,
        text: pctChange > 0
          ? t('insights.spendingUp', 'Spending is up {{pct}}% vs last month', { pct: Math.abs(pctChange) })
          : t('insights.spendingDown', 'Spending is down {{pct}}% vs last month', { pct: Math.abs(pctChange) }),
      });
    }
  }

  // 2. Category with biggest increase
  let biggestIncrease = null;
  let biggestIncreasePct = 0;
  Object.keys(thisMonthExpenses).forEach((cat) => {
    const thisAmt = thisMonthExpenses[cat];
    const lastAmt = lastMonthExpenses[cat] || 0;
    if (lastAmt > 0) {
      const pct = ((thisAmt - lastAmt) / lastAmt) * 100;
      if (pct > biggestIncreasePct && pct >= 30) {
        biggestIncreasePct = pct;
        biggestIncrease = cat;
      }
    }
  });

  if (biggestIncrease) {
    insights.push({
      type: 'info',
      icon: TrendingUp,
      text: t('insights.categoryUp', '{{category}} spending up {{pct}}% this month', {
        category: t(`categories.${biggestIncrease}`, biggestIncrease),
        pct: Math.round(biggestIncreasePct),
      }),
    });
  }

  // 3. Bills due this week
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingBills = (bills || []).filter((bill) => {
    if (!bill.nextDueDate) return false;
    const dueDate = new Date(bill.nextDueDate);
    return dueDate >= now && dueDate <= weekFromNow && !bill.isPaid;
  });

  if (upcomingBills.length > 0) {
    const totalDue = upcomingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    insights.push({
      type: 'alert',
      icon: CalendarClock,
      text: t('insights.billsDue', '{{count}} bill(s) due this week totaling €{{amount}}', {
        count: upcomingBills.length,
        amount: totalDue.toFixed(2),
      }),
    });
  }

  // 4. Savings progress
  const activeSavings = (savingsGoals || []).filter((g) => {
    const current = Number(g.currentAmount) || 0;
    const target = Number(g.targetAmount) || 0;
    return target > 0 && current < target;
  });

  if (activeSavings.length > 0) {
    const totalSaved = activeSavings.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
    const totalTarget = activeSavings.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
    const overallPct = Math.round((totalSaved / totalTarget) * 100);
    insights.push({
      type: 'success',
      icon: PiggyBank,
      text: t('insights.savingsProgress', '{{pct}}% progress toward your savings goals', { pct: overallPct }),
    });
  }

  return insights.slice(0, 3); // Max 3 insights
}

export default function InsightsWidget({
  transactions = [],
  budgets = [],
  bills = [],
  savingsGoals = [],
  onPress,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();

  const insights = useMemo(() => {
    if (isPrivate) {
      return [{ type: 'info', icon: Lightbulb, text: t('insights.hidden', 'Insights hidden in privacy mode') }];
    }
    return calculateInsights(transactions, budgets, bills, savingsGoals, t);
  }, [transactions, budgets, bills, savingsGoals, isPrivate, t]);

  if (!insights.length) {
    return null;
  }

  const getIconColor = (type) => {
    switch (type) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'alert': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  return (
    <AnimatedCard onPress={onPress} style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.header}>
          <Lightbulb size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('insights.title', 'Insights')}</Text>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </View>

        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <View key={index} style={styles.insightRow}>
              <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(insight.type)}15` }]}>
                <Icon size={16} color={getIconColor(insight.type)} />
              </View>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {insight.text}
              </Text>
            </View>
          );
        })}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    ...typography.bodySmall,
    lineHeight: 18,
  },
});
