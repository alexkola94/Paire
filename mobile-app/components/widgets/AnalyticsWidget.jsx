/**
 * AnalyticsWidget Component
 *
 * Shows key analytics summary: monthly balance, income/expenses.
 * Tappable card that navigates to the full Analytics screen.
 * Based on frontend AnalyticsSummaryWidget.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BarChart3, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

export default function AnalyticsWidget({
  totalIncome = 0,
  totalExpenses = 0,
  onPress,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();

  const balance = (Number(totalIncome) || 0) - (Number(totalExpenses) || 0);
  // Ensure numbers always render (avoid NaN)
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${(Number(n) || 0).toFixed(2)}`);
  const isSaving = balance >= 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.glassBorder,
        },
        shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('analytics.viewDetails', 'View Analytics')}
    >
      <View style={styles.mainRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '18' }]}>
          <BarChart3 size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.dataCol}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('analytics.monthlyBalance', 'Monthly Balance')}
          </Text>
          <Text
            style={[
              styles.balanceValue,
              { color: isSaving ? theme.colors.success : theme.colors.error },
            ]}
          >
            {isSaving ? '+' : ''}{formatAmount(balance)}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.colors.textLight} />
      </View>

      <View style={[styles.statsRow, { borderTopColor: theme.colors.glassBorder }]}>
        <View style={styles.statItem}>
          <TrendingUp size={14} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatAmount(totalIncome)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {t('common.income', 'Income')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <TrendingDown size={14} color={theme.colors.error} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatAmount(totalExpenses)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {t('common.expenses', 'Expenses')}
          </Text>
        </View>
      </View>

      <Text style={[styles.linkText, { color: theme.colors.primary }]}>
        {t('analytics.viewDetails', 'View Analytics')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCol: { flex: 1 },
  label: { ...typography.caption, marginBottom: 2 },
  balanceValue: { ...typography.h3, fontSize: 18 },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: { ...typography.body, fontWeight: '600', fontSize: 13 },
  statLabel: { ...typography.caption, fontSize: 11 },
  linkText: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
});
