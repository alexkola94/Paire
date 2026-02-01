/**
 * QuickFill Component
 * 
 * Shows recent transactions as quick-fill options.
 * One-tap to populate form with previous transaction data.
 * 
 * Features:
 * - Horizontal scrollable chips of recent transactions
 * - One-tap to fill form with transaction data
 * - Shows amount, category, and description
 * - Theme-aware styling
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { Clock, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

/**
 * Format currency amount
 */
function formatAmount(amount, currency = '€') {
  return `${currency}${parseFloat(amount).toFixed(0)}`;
}

/**
 * Get unique recent transactions for quick fill
 * Groups by category and takes the most recent of each
 */
function getUniqueRecentTransactions(transactions = [], maxCount = 6) {
  if (!transactions?.length) return [];
  
  // Group by category
  const byCategory = {};
  for (const tx of transactions) {
    const key = tx.category || 'other';
    if (!byCategory[key] || new Date(tx.date) > new Date(byCategory[key].date)) {
      byCategory[key] = tx;
    }
  }
  
  // Sort by date (most recent first) and take max
  return Object.values(byCategory)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, maxCount);
}

/**
 * Single quick fill chip
 */
function QuickFillChip({ transaction, onSelect, theme, index }) {
  const { t } = useTranslation();
  
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(200)}>
      <TouchableOpacity
        style={[
          styles.chip,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.glassBorder,
          },
        ]}
        onPress={() => onSelect(transaction)}
        activeOpacity={0.7}
      >
        <View style={styles.chipContent}>
          <Text style={[styles.chipAmount, { color: theme.colors.primary }]}>
            {formatAmount(transaction.amount)}
          </Text>
          <Text 
            style={[styles.chipCategory, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t(`categories.${transaction.category}`, transaction.category)}
          </Text>
          {transaction.description && (
            <Text 
              style={[styles.chipDesc, { color: theme.colors.textLight }]}
              numberOfLines={1}
            >
              {transaction.description}
            </Text>
          )}
        </View>
        <View style={[styles.chipIcon, { backgroundColor: theme.colors.primary + '15' }]}>
          <Zap size={12} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuickFill({
  recentTransactions = [],
  type = 'expense',
  onSelectTransaction,
  disabled = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Filter transactions by type and get unique recent ones
  const filteredTransactions = recentTransactions.filter(tx => tx.type === type);
  const quickFillOptions = getUniqueRecentTransactions(filteredTransactions);
  
  // Don't render if no options or disabled
  if (quickFillOptions.length === 0 || disabled) {
    return null;
  }
  
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Clock size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
          {t('smartSuggestions.quickFill', 'Quick Fill')}
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {quickFillOptions.map((tx, index) => (
          <QuickFillChip
            key={tx.id || index}
            transaction={tx}
            onSelect={onSelectTransaction}
            theme={theme}
            index={index}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.caption,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 100,
    maxWidth: 150,
  },
  chipContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chipAmount: {
    ...typography.label,
    fontWeight: '700',
  },
  chipCategory: {
    ...typography.caption,
    marginTop: 2,
  },
  chipDesc: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 1,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
