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
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!budgets?.length) {
    return null;
  }

  const displayBudgets = budgets.slice(0, maxDisplay);

  // Check if any budget is at or above warning threshold
  const hasWarning = useMemo(() => {
    return budgets.some((budget) => {
      const limit = Number(budget.amount ?? budget.limit ?? 0) || 0;
      const spent = Number(budget.spentAmount ?? budget.spent_amount ?? 0) || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return pct >= WARNING_THRESHOLD;
    });
  }, [budgets]);

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
          // API may return camelCase (amount, spentAmount) or snake_case (amount, spent_amount)
          const limit = Number(budget.amount ?? budget.limit ?? 0) || 0;
          const spent = Number(budget.spentAmount ?? budget.spent_amount ?? 0) || 0;
          const pct = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0;
          const isOverBudget = pct > 90;
          const pctDisplay = Number.isFinite(pct) ? `${pct.toFixed(0)}%` : '0%';

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
                      width: `${pct}%`, 
                      backgroundColor: isOverBudget ? theme.colors.error : theme.colors.primary 
                    }
                  ]} 
                />
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
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
