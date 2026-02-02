/**
 * CategorySelector Component (React Native)
 * Ported from frontend/src/components/CategorySelector.jsx
 * 
 * Features:
 * - Visual grid of category cards with icons and colors
 * - Support for expense/income category types
 * - "Show more" expansion for full list
 * - Theme-aware styling
 * - Accessibility support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  ShoppingBag,
  Truck,
  Home,
  Zap,
  Film,
  Heart,
  BookOpen,
  DollarSign,
  Briefcase,
  TrendingUp,
  Gift,
  MoreHorizontal,
  CreditCard,
  Shield,
  Wifi,
  Phone,
  Activity,
  Package,
  User,
  Smartphone,
  AlertCircle,
  MapPin,
  Navigation,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

// Default categories
const CATEGORIES = {
  EXPENSE: [
    'food', 'transportation', 'housing', 'utilities', 'entertainment',
    'healthcare', 'shopping', 'education', 'personal', 'groceries',
    'household', 'electronics', 'clothing', 'insurance', 'subscription',
    'rent', 'loan', 'savings', 'internet', 'phone', 'gym', 'gift', 'other'
  ],
  INCOME: ['salary', 'freelance', 'investment', 'gift', 'other'],
};

// Category icons mapping
const categoryIcons = {
  food: ShoppingBag,
  transport: Truck,
  transportation: Truck,
  utilities: Zap,
  entertainment: Film,
  healthcare: Heart,
  shopping: ShoppingBag,
  education: BookOpen,
  salary: DollarSign,
  freelance: Briefcase,
  investment: TrendingUp,
  gift: Gift,
  other: MoreHorizontal,
  housing: Home,
  subscription: Film,
  insurance: Shield,
  rent: Home,
  loan: CreditCard,
  internet: Wifi,
  phone: Phone,
  gym: Activity,
  groceries: ShoppingBag,
  household: Home,
  personal: User,
  electronics: Smartphone,
  clothing: Package,
  emergency: AlertCircle,
  vacation: MapPin,
  house: Home,
  car: Navigation,
  wedding: Heart,
  retirement: TrendingUp,
  savings: TrendingUp,
};

// Category colors mapping
const categoryColors = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  transportation: '#4ECDC4',
  utilities: '#FFE66D',
  entertainment: '#A8E6CF',
  healthcare: '#FF8B94',
  shopping: '#95E1D3',
  education: '#F38181',
  salary: '#AAE3E2',
  freelance: '#DDA0DD',
  investment: '#98D8C8',
  gift: '#F7DC6F',
  other: '#BDC3C7',
  housing: '#95A5A6',
  subscription: '#E74C3C',
  insurance: '#3498DB',
  rent: '#9B59B6',
  loan: '#E67E22',
  internet: '#1ABC9C',
  phone: '#16A085',
  gym: '#F39C12',
  groceries: '#FF6B6B',
  household: '#95A5A6',
  personal: '#DDA0DD',
  electronics: '#3498DB',
  clothing: '#E74C3C',
  emergency: '#EF4444',
  vacation: '#3B82F6',
  house: '#8B5CF6',
  car: '#F59E0B',
  wedding: '#EC4899',
  retirement: '#10B981',
  savings: '#10B981',
};

const INITIAL_VISIBLE_COUNT = 12;

export default function CategorySelector({
  value = '',
  onChange,
  name = 'category',
  categories = [],
  type = 'expense',
  required = false,
  disabled = false,
  label,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get categories list
  const finalCategories = categories && categories.length > 0
    ? categories
    : (type === 'income' ? CATEGORIES.INCOME : CATEGORIES.EXPENSE);

  const visibleCategories = isExpanded 
    ? finalCategories 
    : finalCategories.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = finalCategories.length > INITIAL_VISIBLE_COUNT;

  /**
   * Handle category selection
   */
  const handleSelect = useCallback((categoryValue) => {
    if (disabled) return;
    onChange?.({
      target: {
        name,
        value: categoryValue === value ? '' : categoryValue,
      },
    });
  }, [disabled, onChange, name, value]);

  /**
   * Get icon component for category
   */
  const getIcon = (category) => {
    return categoryIcons[category] || MoreHorizontal;
  };

  /**
   * Get color for category
   */
  const getColor = (category) => {
    return categoryColors[category] || '#BDC3C7';
  };

  /**
   * Get category translation
   */
  const getCategoryLabel = (category) => {
    const keys = [
      `categories.${category}`,
      `recurringBills.categories.${category}`,
      `shoppingLists.categories.${category}`,
      `savingsGoals.categories.${category}`,
    ];

    for (const key of keys) {
      const translation = t(key, { defaultValue: null });
      if (translation && translation !== key) {
        return translation;
      }
    }

    // Fallback: capitalize first letter
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Dynamic styles
  const dynamicStyles = {
    label: { color: theme.colors.text },
    cardDefault: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: 'transparent',
    },
    cardText: { color: theme.colors.textSecondary },
  };

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, dynamicStyles.label]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Category Grid */}
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={label || t('transaction.category')}>
        {visibleCategories.map((category) => {
          const isSelected = value === category;
          const categoryColor = getColor(category);
          const IconComponent = getIcon(category);

          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.card,
                dynamicStyles.cardDefault,
                isSelected && {
                  backgroundColor: `${categoryColor}15`,
                  borderColor: categoryColor,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleSelect(category)}
              disabled={disabled}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={getCategoryLabel(category)}
            >
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
                <IconComponent size={20} color={categoryColor} />
              </View>

              {/* Category Name */}
              <Text
                style={[
                  styles.cardText,
                  dynamicStyles.cardText,
                  isSelected && { color: categoryColor, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {getCategoryLabel(category)}
              </Text>

              {/* Selection Checkmark */}
              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: categoryColor }]}>
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Show More/Less Button */}
        {hasMore && (
          <TouchableOpacity
            style={[styles.card, styles.showMoreBtn, dynamicStyles.cardDefault]}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
              {isExpanded ? (
                <ChevronUp size={20} color={theme.colors.textSecondary} />
              ) : (
                <MoreHorizontal size={20} color={theme.colors.textSecondary} />
              )}
            </View>
            <Text style={[styles.cardText, dynamicStyles.cardText]}>
              {isExpanded ? t('common.showLess', 'Less') : t('common.showMore', 'More')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  required: {
    color: '#e74c3c',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '30%',
    minWidth: 90,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardText: {
    ...typography.caption,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreBtn: {
    borderStyle: 'dashed',
  },
});
