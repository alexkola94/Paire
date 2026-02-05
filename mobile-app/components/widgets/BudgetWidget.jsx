/**
 * BudgetWidget Component
 *
 * Displays budget progress bars for active budgets.
 * Shows warning badge when any budget is at 80% or above.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wallet, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import AnimatedCard from '../AnimatedCard';

const WARNING_THRESHOLD = 80;

export default function BudgetWidget({
  budgets = [],
  onPress,
  maxDisplay = 3,
  /** When provided, used for progress (current-month spent per category); otherwise fallback to API spent_amount */
  spentByCategory = {},
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!budgets?.length) {
    return null;
  }

  const displayBudgets = budgets.slice(0, maxDisplay);

  // Resolve spent: computed from current-month expenses when spentByCategory provided, else API
  const getSpent = (budget) => {
    const fromMap = spentByCategory[budget.category];
    if (fromMap != null) return Number(fromMap) || 0;
    return Number(budget.spent_amount ?? budget.spentAmount ?? 0) || 0;
  };

  // Check if any budget is at or above warning threshold
  const hasWarning = useMemo(() => {
    return budgets.some((budget) => {
      const limit = Number(budget.amount ?? budget.limit ?? 0) || 0;
      const spent = getSpent(budget);
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return pct >= WARNING_THRESHOLD;
    });
  }, [budgets, spentByCategory]);

  return (
    <AnimatedCard onPress={onPress} style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.header}>
          <Wallet size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('budgets.title', 'Budgets')}</Text>
          {hasWarning && (
            <View style={[styles.warningBadge, { backgroundColor: theme.colors.warning }]}>
              <AlertTriangle size={12} color="#fff" />
            </View>
          )}
          <ChevronRight size={18} color={theme.colors.textLight} />
        </View>

        {displayBudgets.map((budget) => {
          const limit = Number(budget.amount ?? budget.limit ?? 0) || 0;
          const spent = getSpent(budget);
          const pct = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0;
          const fillFlex = Number.isFinite(pct) ? pct / 100 : 0;
          const isOverBudget = spent > limit;
          const pctDisplay = Number.isFinite(pct) ? `${Math.round(pct)}%` : '0%';

          return (
            <View key={budget.id} style={styles.budgetRow}>
              <Text style={[styles.budgetName, { color: theme.colors.text }]} numberOfLines={1}>
                {t(`categories.${budget.category}`, budget.category)}
              </Text>
              <View style={[styles.progressBg, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      flex: fillFlex,
                      backgroundColor: isOverBudget ? theme.colors.error : theme.colors.primary,
                    },
                  ]}
                />
                <View style={[styles.progressSpacer, { flex: Math.max(0, 1 - fillFlex) }]} />
              </View>
              <Text style={[styles.budgetPct, { color: theme.colors.textSecondary }]}>
                {pctDisplay}
              </Text>
            </View>
          );
        })}
        
        {budgets.length > maxDisplay && (
          <Text style={[styles.moreText, { color: theme.colors.textLight }]}>
            +{budgets.length - maxDisplay} {t('common.more', 'more')}
          </Text>
        )}
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
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  budgetName: {
    flex: 1,
    fontSize: 13,
  },
  progressBg: {
    flex: 2,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 0,
  },
  progressSpacer: {
    height: '100%',
    minWidth: 0,
  },
  budgetPct: {
    width: 35,
    textAlign: 'right',
    fontSize: 12,
  },
  moreText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  warningBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
