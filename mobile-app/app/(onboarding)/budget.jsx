/**
 * Onboarding Step 3: Create First Budget
 *
 * Quick budget creation to get users started.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PieChart, ChevronRight, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { budgetService } from '../../services/api';
import { impactMedium, notificationSuccess } from '../../utils/haptics';
import { useToast } from '../../components';
import { spacing, borderRadius, typography } from '../../constants/theme';

const QUICK_CATEGORIES = [
  { id: 'groceries', icon: '🛒' },
  { id: 'dining', icon: '🍽️' },
  { id: 'transportation', icon: '🚗' },
  { id: 'entertainment', icon: '🎬' },
  { id: 'shopping', icon: '🛍️' },
  { id: 'utilities', icon: '💡' },
];

const QUICK_AMOUNTS = [100, 200, 300, 500];

export default function OnboardingBudgetScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { updateOnboardingData, onboardingData } = useOnboarding();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('groceries');
  const [amount, setAmount] = useState('200');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast(t('budgets.amountRequired', 'Please enter a valid amount'), 'error');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      await budgetService.create({
        category: selectedCategory,
        amount: parseFloat(amount),
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        isActive: true,
      });
      notificationSuccess();
      showToast(t('budgets.createSuccess', 'Budget created successfully'), 'success');
      await updateOnboardingData({ createdBudget: true });
      router.push('/(onboarding)/transaction');
    } catch (error) {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    impactMedium();
    router.push('/(onboarding)/transaction');
  };

  const currencySymbol = onboardingData.currency === 'USD' ? '$' :
    onboardingData.currency === 'GBP' ? '£' :
    onboardingData.currency === 'EUR' ? '€' : onboardingData.currency;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <PieChart size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('onboarding.budget.title', 'Set Your First Budget')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('onboarding.budget.subtitle', 'Track your spending by category. You can always add more later.')}
            </Text>
          </View>

          {/* Category selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('budgets.category', 'Category')}
          </Text>
          <View style={styles.categoriesGrid}>
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                  selectedCategory === cat.id && { borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  impactMedium();
                  setSelectedCategory(cat.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                  {t(`categories.${cat.id}`, cat.id)}
                </Text>
                {selectedCategory === cat.id && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('budgets.amount', 'Budget Amount')}
          </Text>
          <View style={styles.amountContainer}>
            <View style={[styles.amountInputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00" // i18n-ignore
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    { backgroundColor: theme.colors.surfaceSecondary },
                    amount === String(amt) && { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => {
                    impactMedium();
                    setAmount(String(amt));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.quickAmountText,
                    { color: theme.colors.text },
                    amount === String(amt) && { color: '#fff' },
                  ]}>
                    {currencySymbol}{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreate}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? t('common.loading', 'Loading...') : t('budgets.addBudget', 'Add Budget')}
            </Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              {t('onboarding.skip', 'Skip for now')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    position: 'relative',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  categoryName: {
    ...typography.caption,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountContainer: {
    gap: spacing.md,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  currencySymbol: {
    ...typography.h2,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...typography.h2,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAmountBtn: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  quickAmountText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  createButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  skipButtonText: {
    ...typography.body,
  },
});
