/**
 * QuickAccessWidget Component
 * 
 * Quick access shortcuts to common actions.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Plus, MapPin, PiggyBank, CreditCard, Receipt, Repeat,
  ShoppingCart, Bell, Calculator, Newspaper, Users,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

// Default quick access items
const DEFAULT_ITEMS = [
  { icon: Plus, labelKey: 'navigation.transactions', route: '/(app)/(tabs)/transactions' },
  { icon: MapPin, labelKey: 'travel.common.enterTravelMode', route: '/(app)/travel' },
  { icon: PiggyBank, labelKey: 'navigation.savingsGoals', route: '/(app)/savings-goals' },
  { icon: CreditCard, labelKey: 'navigation.loans', route: '/(app)/loans' },
  { icon: Receipt, labelKey: 'receipts.title', route: '/(app)/receipts' },
  { icon: Repeat, labelKey: 'navigation.recurringBills', route: '/(app)/recurring-bills' },
  { icon: ShoppingCart, labelKey: 'navigation.shoppingLists', route: '/(app)/shopping-lists' },
  { icon: Bell, labelKey: 'navigation.reminders', route: '/(app)/reminders' },
  { icon: Calculator, labelKey: 'navigation.currencyCalculator', route: '/(app)/currency-calculator' },
  { icon: Newspaper, labelKey: 'navigation.economicNews', route: '/(app)/economic-news' },
  { icon: Users, labelKey: 'navigation.partnership', route: '/(app)/partnership' },
];

export default function QuickAccessWidget({ 
  items = DEFAULT_ITEMS,
  onItemPress,
  columns = 4,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('dashboard.quickAccess', 'Quick Access')}
      </Text>
      
      <View style={styles.grid}>
        {items.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.item,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.glassBorder,
                  width: `${100 / columns - 2}%`,
                },
                shadows.sm,
              ]}
              onPress={() => onItemPress?.(item.route)}
              activeOpacity={0.7}
            >
              <IconComponent size={22} color={theme.colors.primary} />
              {/* Label always visible: wrap so no language is hidden */}
              <Text style={[styles.itemLabel, { color: theme.colors.text }]}>
                {t(item.labelKey, item.labelKey.split('.').pop())}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  item: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
    minHeight: 56,
  },
  itemLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
