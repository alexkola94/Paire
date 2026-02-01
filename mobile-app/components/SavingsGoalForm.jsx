/**
 * SavingsGoalForm Component (React Native)
 * Form for creating/editing savings goals.
 * 
 * Features:
 * - Goal name
 * - Target and current amounts
 * - Target date picker
 * - Category selector
 * - Priority selector
 * - Color and icon pickers
 * - Notes
 * - Form validation
 * - Theme-aware styling
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Target, Calendar, Flag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import CurrencyInput from './CurrencyInput';
import DateInput from './DateInput';
import CategorySelector from './CategorySelector';
import Dropdown from './Dropdown';
import Button from './Button';
import FormSection from './FormSection';

// Savings goal categories
const GOAL_CATEGORIES = [
  'emergency', 'vacation', 'house', 'car', 'wedding',
  'education', 'retirement', 'investment', 'other'
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// Color options
const COLOR_OPTIONS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
];

export default function SavingsGoalForm({
  goal = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    targetAmount: goal?.targetAmount || '',
    currentAmount: goal?.currentAmount || '',
    targetDate: goal?.targetDate ? goal.targetDate.split('T')[0] : '',
    category: goal?.category || '',
    priority: goal?.priority || 'medium',
    color: goal?.color || '#8B5CF6',
    icon: goal?.icon || '🎯',
    notes: goal?.notes || '',
  });
  const [error, setError] = useState('');

  // Get translated priority options
  const priorityOptions = PRIORITY_OPTIONS.map(opt => ({
    ...opt,
    label: t(`savingsGoals.priority.${opt.value}`, opt.label),
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
    if (!formData.name.trim()) {
      setError(t('savingsGoals.nameRequired', 'Please enter a goal name'));
      return false;
    }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      setError(t('savingsGoals.targetRequired', 'Please enter a target amount'));
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
        id: goal?.id,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
      };

      await onSubmit?.(submitData);
    } catch (err) {
      setError(err.message || t('common.error', 'An error occurred'));
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.colors.surface },
    label: { color: theme.colors.text },
    input: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
      color: theme.colors.text,
    },
    placeholder: theme.colors.textLight,
    error: {
      backgroundColor: `${theme.colors.error}15`,
      borderColor: theme.colors.error,
    },
    errorText: { color: theme.colors.error },
    colorBtn: {
      borderColor: theme.colors.glassBorder,
    },
    colorBtnActive: {
      borderColor: theme.colors.text,
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

      {/* Goal Name */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('savingsGoals.goalName', 'Goal Name')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder={t('savingsGoals.namePlaceholder', 'e.g., Vacation Fund')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          maxLength={100}
        />
      </View>

      {/* Target Amount */}
      <CurrencyInput
        value={formData.targetAmount}
        onChange={(value) => handleChange('targetAmount', value)}
        label={`${t('savingsGoals.targetAmount', 'Target Amount')} *`}
        placeholder="0.00"
        disabled={loading}
        quickAmounts={[500, 1000, 5000, 10000]}
      />

      {/* Current Amount (for editing) */}
      {goal && (
        <CurrencyInput
          value={formData.currentAmount}
          onChange={(value) => handleChange('currentAmount', value)}
          label={t('savingsGoals.currentAmount', 'Current Amount')}
          placeholder="0.00"
          disabled={loading}
          quickAmounts={[50, 100, 500, 1000]}
        />
      )}

      {/* Target Date */}
      <DateInput
        value={formData.targetDate}
        onChange={handleEventChange}
        name="targetDate"
        label={t('savingsGoals.targetDate', 'Target Date')}
        disabled={loading}
        showQuickButtons={false}
      />

      {/* Category */}
      <CategorySelector
        value={formData.category}
        onChange={handleEventChange}
        name="category"
        type="expense"
        categories={GOAL_CATEGORIES}
        label={t('savingsGoals.category', 'Category')}
        disabled={loading}
      />

      {/* Additional Details */}
      <FormSection
        title={t('savingsGoals.additionalDetails', 'Additional Details')}
        collapsible
        defaultExpanded={!!(formData.notes || goal)}
      >
        {/* Priority */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('savingsGoals.priorityLabel', 'Priority')}
          </Text>
          <Dropdown
            value={formData.priority}
            onChange={(value) => handleChange('priority', value)}
            options={priorityOptions}
            placeholder={t('savingsGoals.selectPriority', 'Select priority')}
            disabled={loading}
          />
        </View>

        {/* Color Picker */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('savingsGoals.color', 'Color')}
          </Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorBtn,
                  { backgroundColor: color },
                  dynamicStyles.colorBtn,
                  formData.color === color && dynamicStyles.colorBtnActive,
                  formData.color === color && { borderWidth: 3 },
                ]}
                onPress={() => handleChange('color', color)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('savingsGoals.notes', 'Notes')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, dynamicStyles.input]}
            value={formData.notes}
            onChangeText={(text) => handleChange('notes', text)}
            placeholder={t('savingsGoals.notesPlaceholder', 'Add any notes about this goal...')}
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>
      </FormSection>

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
  input: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 2,
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
