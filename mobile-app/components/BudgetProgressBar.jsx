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

  // Coerce to numbers (API may return snake_case or string values)
  const spentNum = Number(spent) || 0;
  const totalNum = Number(total) || 0;

  // Percentage 0–100 from actual data; cap at 100 for bar width, but we still show over-budget color
  const percentage = useMemo(() => {
    if (totalNum === 0 || !Number.isFinite(totalNum)) return 0;
    const pct = (spentNum / totalNum) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [spentNum, totalNum]);

  // Flex fraction for fill (0–1) so the bar width is based on data and works in RN flex layout
  const fillFlex = useMemo(() => {
    if (!Number.isFinite(percentage)) return 0;
    return percentage / 100;
  }, [percentage]);

  const isOverBudget = spentNum > totalNum;
  const progressColor = useMemo(() => {
    if (isOverBudget) return theme.colors.error;
    if (percentage > 85) return theme.colors.warning;
    return color || theme.colors.primary;
  }, [isOverBudget, percentage, color, theme]);

  // Always render strings so numbers display reliably on React Native
  const displaySpent = isPrivate ? '••••' : (currencyFormatter ? currencyFormatter(spentNum) : String(spentNum));
  const displayTotal = isPrivate ? '••••' : (currencyFormatter ? currencyFormatter(totalNum) : String(totalNum));

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
            {` / ${displayTotal}`}
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <View
          style={[
            styles.fill,
            {
              flex: fillFlex,
              backgroundColor: progressColor,
            },
          ]}
        />
        <View style={[styles.fillSpacer, { flex: Math.max(0, 1 - fillFlex) }]} />
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
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.sm,
    minWidth: 0,
  },
  fillSpacer: {
    height: '100%',
    minWidth: 0,
  },
});
