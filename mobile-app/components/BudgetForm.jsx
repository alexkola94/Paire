/**
 * BudgetForm Component (React Native)
 * Form for creating/editing budgets.
 * 
 * Features:
 * - Category selector
 * - Amount input
 * - Period selector (monthly/yearly)
 * - Form validation
 * - Theme-aware styling
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import CurrencyInput from './CurrencyInput';
import CategorySelector from './CategorySelector';
import Dropdown from './Dropdown';
import Button from './Button';

// Budget categories (expense-type)
const BUDGET_CATEGORIES = [
  'food', 'transportation', 'utilities', 'entertainment', 'healthcare',
  'shopping', 'education', 'housing', 'personal', 'other'
];

// Period options
const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function BudgetForm({
  budget = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    category: budget?.category || '',
    amount: budget?.amount || '',
    period: budget?.period || 'monthly',
  });
  const [error, setError] = useState('');

  // Get translated period options
  const periodOptions = PERIOD_OPTIONS.map(opt => ({
    ...opt,
    label: t(`budgets.period.${opt.value}`, opt.label),
  }));

  /**
   * Handle field changes
   */
  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  }, []);

  /**
   * Handle event-style changes
   */
  const handleEventChange = useCallback((e) => {
    const { name, value } = e.target;
    handleChange(name, value);
  }, [handleChange]);

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!formData.category) {
      setError(t('budgets.categoryRequired', 'Please select a category'));
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError(t('budgets.amountRequired', 'Please enter a valid amount'));
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const submitData = {
        ...formData,
        id: budget?.id,
        amount: parseFloat(formData.amount),
      };

      await onSubmit?.(submitData);
    } catch (err) {
      setError(err.message || t('common.error', 'An error occurred'));
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: {
      backgroundColor: theme.colors.surface,
    },
    label: {
      color: theme.colors.text,
    },
    error: {
      backgroundColor: `${theme.colors.error}15`,
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
    },
  };

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Error Message */}
      {error !== '' && (
        <View style={[styles.errorContainer, dynamicStyles.error]}>
          <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
        </View>
      )}

      {/* Category Selector */}
      <CategorySelector
        value={formData.category}
        onChange={handleEventChange}
        name="category"
        type="expense"
        categories={BUDGET_CATEGORIES}
        label={`${t('budgets.category', 'Category')} *`}
        required
        disabled={loading}
      />

      {/* Amount */}
      <CurrencyInput
        value={formData.amount}
        onChange={(value) => handleChange('amount', value)}
        label={`${t('budgets.budgetAmount', 'Budget Amount')} *`}
        placeholder="0.00"
        disabled={loading}
        quickAmounts={[100, 200, 500, 1000]}
      />

      {/* Period */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('budgets.period.label', 'Period')}
        </Text>
        <Dropdown
          value={formData.period}
          onChange={(value) => handleChange('period', value)}
          options={periodOptions}
          placeholder={t('budgets.selectPeriod', 'Select period')}
          disabled={loading}
        />
      </View>

      {/* Form Actions */}
      <View style={styles.actions}>
        <Button
          title={t('common.cancel', 'Cancel')}
          variant="secondary"
          onPress={onCancel}
          disabled={loading}
          style={styles.actionBtn}
        />
        <Button
          title={loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  fieldWrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
  },
});
