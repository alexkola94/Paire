/**
 * SmartCategorySuggestions Component
 * 
 * Analyzes transaction description and suggests appropriate categories.
 * Uses keyword matching to provide intelligent category suggestions.
 * 
 * Features:
 * - Real-time analysis of description text
 * - Keyword-based category matching
 * - One-tap to apply suggestion
 * - Theme-aware styling with animations
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { Sparkles, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

// Category keywords mapping for expense categories
const EXPENSE_KEYWORDS = {
  food: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'sushi', 'food', 'eat', 'meal', 'snack', 'takeout', 'delivery', 'uber eats', 'deliveroo', 'wolt', 'mcdonalds', 'starbucks', 'kfc'],
  transportation: ['uber', 'lyft', 'taxi', 'bus', 'metro', 'train', 'subway', 'fuel', 'gas', 'petrol', 'parking', 'toll', 'bolt', 'grab', 'transit', 'transport', 'car', 'ride'],
  utilities: ['electricity', 'electric', 'water', 'gas bill', 'internet', 'wifi', 'phone', 'mobile', 'utility', 'dei', 'eydap', 'cosmote', 'vodafone', 'wind'],
  entertainment: ['movie', 'cinema', 'netflix', 'spotify', 'concert', 'game', 'gaming', 'playstation', 'xbox', 'steam', 'youtube', 'disney', 'hbo', 'amazon prime', 'entertainment', 'fun', 'party'],
  healthcare: ['doctor', 'hospital', 'pharmacy', 'medicine', 'health', 'medical', 'dentist', 'clinic', 'prescription', 'therapy', 'gym membership'],
  shopping: ['amazon', 'shop', 'store', 'mall', 'clothes', 'clothing', 'shoes', 'fashion', 'zara', 'h&m', 'ikea', 'purchase', 'buy'],
  education: ['course', 'book', 'school', 'university', 'tuition', 'class', 'udemy', 'coursera', 'learning', 'education', 'training'],
  housing: ['rent', 'mortgage', 'home', 'apartment', 'repair', 'maintenance', 'furniture', 'cleaning', 'airbnb'],
  personal: ['haircut', 'salon', 'spa', 'beauty', 'grooming', 'cosmetics', 'makeup', 'personal care'],
  subscription: ['subscription', 'membership', 'monthly', 'annual', 'recurring'],
  groceries: ['supermarket', 'grocery', 'groceries', 'market', 'sklavenitis', 'ab', 'lidl', 'aldi', 'carrefour', 'tesco'],
  insurance: ['insurance', 'policy', 'premium', 'coverage'],
};

// Category keywords mapping for income categories
const INCOME_KEYWORDS = {
  salary: ['salary', 'paycheck', 'wage', 'payday', 'payroll', 'bonus', 'overtime'],
  freelance: ['freelance', 'contract', 'project', 'client', 'consulting', 'gig', 'fiverr', 'upwork'],
  investment: ['dividend', 'interest', 'stock', 'investment', 'return', 'crypto', 'trading', 'profit'],
  gift: ['gift', 'present', 'birthday', 'christmas', 'inheritance', 'received'],
  other: ['refund', 'reimbursement', 'cashback', 'rebate', 'sold', 'selling'],
};

/**
 * Analyze description and find matching categories
 */
function analyzeDescription(description, type = 'expense') {
  if (!description || description.trim().length < 2) {
    return [];
  }
  
  const normalizedDesc = description.toLowerCase().trim();
  const keywords = type === 'expense' ? EXPENSE_KEYWORDS : INCOME_KEYWORDS;
  const matches = [];
  
  // Check each category for keyword matches
  for (const [category, categoryKeywords] of Object.entries(keywords)) {
    for (const keyword of categoryKeywords) {
      if (normalizedDesc.includes(keyword)) {
        // Calculate confidence based on match quality
        const confidence = keyword.length > 4 ? 0.9 : 0.7;
        
        // Avoid duplicates
        if (!matches.find(m => m.category === category)) {
          matches.push({
            category,
            keyword,
            confidence,
          });
        }
        break; // Found match for this category
      }
    }
  }
  
  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Single suggestion chip
 */
function SuggestionChip({ category, confidence, isSelected, onSelect, theme }) {
  const { t } = useTranslation();
  
  return (
    <Animated.View entering={FadeIn.delay(100).duration(200)}>
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: isSelected 
              ? theme.colors.primary 
              : theme.colors.primary + '15',
            borderColor: theme.colors.primary + '40',
          },
        ]}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <Check size={14} color="#fff" />
        ) : (
          <Sparkles size={14} color={theme.colors.primary} />
        )}
        <Text
          style={[
            styles.chipText,
            { color: isSelected ? '#fff' : theme.colors.primary },
          ]}
        >
          {t(`categories.${category}`, category)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SmartCategorySuggestions({
  description,
  type = 'expense',
  currentCategory,
  onSelectCategory,
  disabled = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Analyze description and get suggestions
  const suggestions = useMemo(() => {
    return analyzeDescription(description, type);
  }, [description, type]);
  
  // Don't render if no suggestions or disabled
  if (suggestions.length === 0 || disabled) {
    return null;
  }
  
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.container, { backgroundColor: theme.colors.surfaceSecondary + '50' }]}
    >
      <View style={styles.header}>
        <Sparkles size={14} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
          {t('smartSuggestions.suggestedCategory', 'Suggested Category')}
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {suggestions.map(({ category, confidence }) => (
          <SuggestionChip
            key={category}
            category={category}
            confidence={confidence}
            isSelected={currentCategory === category}
            onSelect={() => onSelectCategory(category)}
            theme={theme}
          />
        ))}
      </ScrollView>
      
      <Text style={[styles.hint, { color: theme.colors.textLight }]}>
        {t('smartSuggestions.tapToApply', 'Tap to apply')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.caption,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
