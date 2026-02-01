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
  
  const balance = totalIncome - totalExpenses;
  
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${Number(n).toFixed(2)}`);
  
  return (
    <View style={styles.container}>
      {/* Income */}
      <View style={[styles.card, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.glassBorder }]}>
        <TrendingUp size={20} color={theme.colors.success} />
        <Text style={[styles.amount, { color: theme.colors.text }]}>{formatAmount(totalIncome)}</Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('dashboard.income', 'Income')}</Text>
      </View>
      
      {/* Expenses */}
      <View style={[styles.card, { backgroundColor: theme.colors.error + '18', borderColor: theme.colors.glassBorder }]}>
        <TrendingDown size={20} color={theme.colors.error} />
        <Text style={[styles.amount, { color: theme.colors.text }]}>{formatAmount(totalExpenses)}</Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('dashboard.expenses', 'Expenses')}</Text>
      </View>
      
      {/* Balance */}
      <View style={[styles.card, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.glassBorder }]}>
        <Wallet size={20} color={theme.colors.primary} />
        <Text style={[styles.amount, { color: theme.colors.text }]}>{formatAmount(balance)}</Text>
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
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
