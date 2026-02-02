/**
 * RecentTransactionsWidget Component
 * 
 * Displays recent transactions with tap to view details.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CreditCard, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import AnimatedCard from '../AnimatedCard';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = (dateStr + '').split('T')[0];
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function RecentTransactionsWidget({ 
  transactions = [], 
  onPress,
  onTransactionPress,
  maxDisplay = 5,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  
  const displayTransactions = transactions.slice(0, maxDisplay);
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${Number(n).toFixed(2)}`);
  
  return (
    <AnimatedCard onPress={onPress} style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.header}>
          <CreditCard size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('dashboard.recentTransactions', 'Recent Transactions')}
          </Text>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </View>
        
        {displayTransactions.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            {t('common.noData', 'No data yet')}
          </Text>
        ) : (
          displayTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            return (
              <TouchableOpacity
                key={tx.id}
                style={[styles.txRow, { borderBottomColor: theme.colors.glassBorder }]}
                onPress={() => onTransactionPress?.(tx)}
                activeOpacity={0.7}
              >
                <View style={styles.txInfo}>
                  <Text style={[styles.txDesc, { color: theme.colors.text }]} numberOfLines={1}>
                    {tx.description || tx.category || '—'}
                  </Text>
                  <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>
                    {formatDate(tx.date)}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount, 
                  { color: isExpense ? theme.colors.error : theme.colors.success }
                ]}>
                  {isExpense ? '-' : '+'}{formatAmount(tx.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
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
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    ...typography.body,
    fontWeight: '500',
  },
  txDate: {
    ...typography.caption,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    ...typography.bodySmall,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
});
