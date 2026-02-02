/**
 * Saving goal progress bar (React Native).
 * Ported from frontend SavingGoalProgressBar; shows current/target with progress fill.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { usePrivacyMode } from '../context/PrivacyModeContext';
import { spacing, borderRadius } from '../constants/theme';

export default function SavingGoalProgressBar({
  label,
  currentAmount,
  targetAmount,
  currencyFormatter,
  icon: Icon,
  color, // Optional custom color for the progress bar
}) {
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();

  const percentage = useMemo(() => {
    if (!targetAmount || targetAmount === 0) return 0;
    return Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));
  }, [currentAmount, targetAmount]);

  // Use custom color if provided, otherwise default based on completion
  const progressColor = useMemo(() => {
    if (color) return color;
    if (percentage >= 100) return theme.colors.success;
    return theme.colors.info;
  }, [percentage, theme, color]);

  const displayCurrent = isPrivate
    ? '••••'
    : currencyFormatter
    ? currencyFormatter(currentAmount)
    : String(currentAmount);
  const displayTarget = isPrivate
    ? '••••'
    : currencyFormatter
    ? currencyFormatter(targetAmount)
    : String(targetAmount);

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
          <Text style={[styles.current, { color: theme.colors.text }]}>{displayCurrent}</Text>
          <Text style={[styles.target, { color: theme.colors.textSecondary }]}>
            {' / '}
            {displayTarget}
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
  current: {
    fontSize: 14,
    fontWeight: '600',
  },
  target: {
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
