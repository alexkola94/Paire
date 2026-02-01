/**
 * DuplicateDetection Component
 * 
 * Checks for similar transactions and warns the user.
 * Helps prevent accidental duplicate entries.
 * 
 * Features:
 * - Real-time duplicate checking
 * - Shows similar transaction details
 * - Dismissable warning banner
 * - Theme-aware styling
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { AlertTriangle, X, Eye, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

/**
 * Check if two transactions are similar
 * Similar = same amount + within 7 days + similar description
 */
function findSimilarTransactions(newTransaction, existingTransactions = []) {
  if (!newTransaction.amount || !existingTransactions?.length) {
    return [];
  }
  
  const amount = parseFloat(newTransaction.amount);
  const newDate = newTransaction.date ? new Date(newTransaction.date) : new Date();
  const newDesc = (newTransaction.description || '').toLowerCase().trim();
  
  return existingTransactions.filter((tx) => {
    // Same amount (within 1% tolerance)
    const txAmount = parseFloat(tx.amount);
    const amountMatch = Math.abs(amount - txAmount) / Math.max(amount, 1) < 0.01;
    
    // Within 7 days
    const txDate = new Date(tx.date);
    const daysDiff = Math.abs((newDate - txDate) / (1000 * 60 * 60 * 24));
    const dateMatch = daysDiff <= 7;
    
    // Similar description (if both have descriptions)
    const txDesc = (tx.description || '').toLowerCase().trim();
    let descMatch = false;
    if (newDesc && txDesc) {
      // Check if one contains the other or they share significant words
      descMatch = newDesc.includes(txDesc) || txDesc.includes(newDesc);
      if (!descMatch) {
        // Check for common significant words
        const newWords = newDesc.split(/\s+/).filter(w => w.length > 3);
        const txWords = txDesc.split(/\s+/).filter(w => w.length > 3);
        const commonWords = newWords.filter(w => txWords.includes(w));
        descMatch = commonWords.length > 0;
      }
    } else {
      // If no descriptions, rely on amount + date
      descMatch = true;
    }
    
    return amountMatch && dateMatch && (descMatch || (!newDesc && !txDesc));
  }).slice(0, 3); // Max 3 potential duplicates
}

/**
 * Format currency amount
 */
function formatAmount(amount, currency = '€') {
  return `${currency}${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return dateStr;
  }
}

export default function DuplicateDetection({
  newTransaction,
  existingTransactions = [],
  onDismiss,
  onViewOriginal,
  dismissed = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Find similar transactions
  const duplicates = useMemo(() => {
    if (dismissed) return [];
    return findSimilarTransactions(newTransaction, existingTransactions);
  }, [newTransaction, existingTransactions, dismissed]);
  
  // Don't render if no duplicates found or dismissed
  if (duplicates.length === 0 || dismissed) {
    return null;
  }
  
  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      exiting={SlideOutUp.duration(200)}
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning + '40',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <AlertTriangle size={18} color={theme.colors.warning} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('smartSuggestions.duplicateWarning.title', 'Possible Duplicate')}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Message */}
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {t('smartSuggestions.duplicateWarning.message', 'A similar transaction was found')}
        {duplicates.length > 1 && ` (${duplicates.length} similar)`}
      </Text>
      
      {/* Similar transaction preview */}
      <TouchableOpacity
        style={[styles.duplicateCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.duplicateInfo}>
          <Text style={[styles.duplicateAmount, { color: theme.colors.text }]}>
            {formatAmount(duplicates[0].amount)}
          </Text>
          <Text style={[styles.duplicateDate, { color: theme.colors.textSecondary }]}>
            {formatDate(duplicates[0].date)}
          </Text>
          {duplicates[0].description && (
            <Text 
              style={[styles.duplicateDesc, { color: theme.colors.textLight }]}
              numberOfLines={1}
            >
              {duplicates[0].description}
            </Text>
          )}
        </View>
        {expanded ? (
          <ChevronUp size={18} color={theme.colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
      
      {/* Expanded details */}
      {expanded && duplicates.length > 1 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.expandedList}>
          {duplicates.slice(1).map((tx, index) => (
            <View
              key={tx.id || index}
              style={[styles.expandedItem, { borderTopColor: theme.colors.glassBorder }]}
            >
              <Text style={[styles.duplicateAmount, { color: theme.colors.text }]}>
                {formatAmount(tx.amount)}
              </Text>
              <Text style={[styles.duplicateDate, { color: theme.colors.textSecondary }]}>
                {formatDate(tx.date)}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}
      
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            {t('smartSuggestions.duplicateWarning.dismiss', 'Dismiss')}
          </Text>
        </TouchableOpacity>
        
        {onViewOriginal && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => onViewOriginal(duplicates[0])}
            activeOpacity={0.7}
          >
            <Eye size={14} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {t('smartSuggestions.duplicateWarning.viewOriginal', 'View Original')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  dismissBtn: {
    padding: spacing.xs,
  },
  message: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  duplicateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  duplicateInfo: {
    flex: 1,
  },
  duplicateAmount: {
    ...typography.body,
    fontWeight: '600',
  },
  duplicateDate: {
    ...typography.caption,
    marginTop: 2,
  },
  duplicateDesc: {
    ...typography.caption,
    marginTop: 2,
  },
  expandedList: {
    marginBottom: spacing.sm,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
