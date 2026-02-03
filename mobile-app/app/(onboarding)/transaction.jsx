/**
 * Onboarding Step 4: Add First Transaction
 *
 * Quick transaction creation to get users started.
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
import { Receipt, ChevronRight, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { transactionService } from '../../services/api';
import { impactMedium, notificationSuccess } from '../../utils/haptics';
import { useToast } from '../../components';
import { spacing, borderRadius, typography } from '../../constants/theme';

const QUICK_CATEGORIES = [
  { id: 'groceries', icon: '🛒' },
  { id: 'dining', icon: '🍽️' },
  { id: 'transportation', icon: '🚗' },
  { id: 'coffee', icon: '☕' },
  { id: 'shopping', icon: '🛍️' },
  { id: 'other', icon: '📝' },
];

export default function OnboardingTransactionScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { updateOnboardingData, onboardingData, completeOnboarding } = useOnboarding();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('groceries');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast(t('validation.required', { field: t('transactions.amount', 'Amount') }), 'error');
      return;
    }

    setLoading(true);
    try {
      await transactionService.create({
        type: 'expense',
        category: selectedCategory,
        amount: parseFloat(amount),
        description: description || t(`categories.${selectedCategory}`, selectedCategory),
        date: new Date().toISOString().split('T')[0],
      });
      notificationSuccess();
      showToast(t('expenses.createSuccess', 'Expense added successfully'), 'success');
      await updateOnboardingData({ createdTransaction: true });
      router.push('/(onboarding)/complete');
    } catch (error) {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    impactMedium();
    router.push('/(onboarding)/complete');
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
          <View style={[styles.progressDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.colors.primary }]} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Receipt size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('onboarding.transaction.title', 'Add Your First Expense')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('onboarding.transaction.subtitle', 'Start tracking your spending right away.')}
            </Text>
          </View>

          {/* Amount input */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('transactions.amount', 'Amount')}
          </Text>
          <View style={[styles.amountInputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>{currencySymbol}</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.colors.textLight}
            />
          </View>

          {/* Category selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('transactions.category', 'Category')}
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

          {/* Description input */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('transactions.description', 'Description')} ({t('common.optional', 'optional')})
          </Text>
          <View style={[styles.descInputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <TextInput
              style={[styles.descInput, { color: theme.colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('transactions.descriptionPlaceholder', 'What did you buy?')}
              placeholderTextColor={theme.colors.textLight}
            />
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
              {loading ? t('common.loading', 'Loading...') : t('expenses.addExpense', 'Add Expense')}
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
  descInputWrapper: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  descInput: {
    ...typography.body,
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
