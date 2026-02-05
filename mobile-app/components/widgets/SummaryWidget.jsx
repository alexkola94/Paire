/**
 * SummaryWidget Component
 * 
 * Displays income, expenses, and balance overview.
 * Features theme-aware styling with soft tinted backgrounds.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

export default function SummaryWidget({ 
  totalIncome = 0, 
  totalExpenses = 0,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  
  const balance = (Number(totalIncome) || 0) - (Number(totalExpenses) || 0);

  // Ensure numbers always render (avoid NaN); coerce to number then format
  const formatAmount = (n) =>
    isPrivacyMode ? '••••' : `€${(Number(n) || 0).toFixed(2)}`;
  
  return (
    <View style={styles.container}>
      {/* Income */}
      <View style={[styles.card, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.glassBorder }]}>
        <TrendingUp size={20} color={theme.colors.success} />
        <View style={styles.amountWrap}>
          <Text
            style={[styles.amount, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatAmount(totalIncome)}
          </Text>
        </View>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('dashboard.income', 'Income')}</Text>
      </View>

      {/* Expenses */}
      <View style={[styles.card, { backgroundColor: theme.colors.error + '18', borderColor: theme.colors.glassBorder }]}>
        <TrendingDown size={20} color={theme.colors.error} />
        <View style={styles.amountWrap}>
          <Text
            style={[styles.amount, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatAmount(totalExpenses)}
          </Text>
        </View>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('dashboard.expenses', 'Expenses')}</Text>
      </View>

      {/* Balance */}
      <View style={[styles.card, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.glassBorder }]}>
        <Wallet size={20} color={theme.colors.primary} />
        <View style={styles.amountWrap}>
          <Text
            style={[styles.amount, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatAmount(balance)}
          </Text>
        </View>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('dashboard.balance', 'Balance')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  // Wrapper so large amounts have room and scale down instead of clipping
  amountWrap: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
