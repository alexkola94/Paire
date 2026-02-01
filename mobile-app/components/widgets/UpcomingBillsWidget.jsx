/**
 * UpcomingBillsWidget Component
 * 
 * Displays upcoming bills due in the next 7 days.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, ChevronRight, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import AnimatedCard from '../AnimatedCard';

export default function UpcomingBillsWidget({ 
  bills = [], 
  onPress,
  maxDisplay = 3,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  
  if (!bills?.length) {
    return null;
  }
  
  const displayBills = bills.slice(0, maxDisplay);
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${Number(n).toFixed(2)}`);
  
  // Check if any bill is overdue
  const hasOverdue = bills.some(bill => {
    const dueDate = new Date(bill.nextDueDate);
    return dueDate < new Date();
  });
  
  return (
    <AnimatedCard onPress={onPress} style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.header}>
          <Bell size={18} color={hasOverdue ? theme.colors.error : theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('recurringBills.upcoming', 'Upcoming Bills')}
          </Text>
          {hasOverdue && <AlertCircle size={16} color={theme.colors.error} />}
          <ChevronRight size={18} color={theme.colors.textLight} />
        </View>
        
        {displayBills.map((bill) => {
          const dueDate = new Date(bill.nextDueDate);
          const isOverdue = dueDate < new Date();
          const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
          
          return (
            <View key={bill.id} style={styles.billRow}>
              <View style={styles.billInfo}>
                <Text style={[styles.billName, { color: theme.colors.text }]} numberOfLines={1}>
                  {bill.name}
                </Text>
                <Text style={[
                  styles.billDue, 
                  { color: isOverdue ? theme.colors.error : theme.colors.textSecondary }
                ]}>
                  {isOverdue 
                    ? t('recurringBills.overdue', 'Overdue')
                    : daysUntil === 0 
                      ? t('recurringBills.today', 'Today')
                      : daysUntil === 1
                        ? t('recurringBills.tomorrow', 'Tomorrow')
                        : `${daysUntil} ${t('recurringBills.daysLeft', 'days')}`
                  }
                </Text>
              </View>
              <Text style={[styles.billAmount, { color: theme.colors.primary }]}>
                {formatAmount(bill.amount)}
              </Text>
            </View>
          );
        })}
        
        {bills.length > maxDisplay && (
          <Text style={[styles.moreText, { color: theme.colors.textLight }]}>
            +{bills.length - maxDisplay} {t('common.more', 'more')}
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
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 14,
    fontWeight: '500',
  },
  billDue: {
    ...typography.caption,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  moreText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
