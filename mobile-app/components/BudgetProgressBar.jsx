/**
 * Budget progress bar (React Native).
 * Ported from frontend BudgetProgressBar; shows spent/total with progress fill.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { usePrivacyMode } from '../context/PrivacyModeContext';
import { spacing, borderRadius } from '../constants/theme';

export default function BudgetProgressBar({
  label,
  spent,
  total,
  currencyFormatter,
  color,
  icon: Icon,
}) {
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();

  const percentage = useMemo(() => {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.max(0, (spent / total) * 100));
  }, [spent, total]);

  const isOverBudget = spent > total;
  const progressColor = useMemo(() => {
    if (isOverBudget) return theme.colors.error;
    if (percentage > 85) return theme.colors.warning;
    return color || theme.colors.primary;
  }, [isOverBudget, percentage, color, theme]);

  const displaySpent = isPrivate ? '••••' : (currencyFormatter ? currencyFormatter(spent) : String(spent));
  const displayTotal = isPrivate ? '••••' : (currencyFormatter ? currencyFormatter(total) : String(total));

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.labelRow}>
          {Icon && <Icon size={16} color={theme.colors.primary} style={styles.icon} />}
          <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={styles.values}>
          <Text
            style={[
              styles.spent,
              { color: isOverBudget ? theme.colors.error : theme.colors.text },
            ]}
          >
            {displaySpent}
          </Text>
          <Text style={[styles.total, { color: theme.colors.textSecondary }]}>
            {' / '}
            {displayTotal}
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  values: {
    flexDirection: 'row',
  },
  spent: {
    fontSize: 14,
    fontWeight: '600',
  },
  total: {
    fontSize: 14,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
});
