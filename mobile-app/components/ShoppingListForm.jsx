/**
 * ShoppingListForm Component (React Native)
 * Form for creating/editing shopping lists.
 * 
 * Features:
 * - List name
 * - Category selector
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import CategorySelector from './CategorySelector';
import Button from './Button';

// Shopping list categories
const LIST_CATEGORIES = [
  'groceries', 'household', 'personal', 'electronics', 'clothing', 'other'
];

export default function ShoppingListForm({
  list = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    name: list?.name || '',
    category: list?.category || '',
    notes: list?.notes || '',
  });
  const [error, setError] = useState('');

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
      setError(t('shoppingLists.nameRequired', 'Please enter a list name'));
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
        id: list?.id,
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

      {/* List Name */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('shoppingLists.listName', 'List Name')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder={t('shoppingLists.namePlaceholder', 'e.g., Weekly Groceries')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          maxLength={100}
        />
      </View>

      {/* Category */}
      <CategorySelector
        value={formData.category}
        onChange={handleEventChange}
        name="category"
        type="expense"
        categories={LIST_CATEGORIES}
        label={t('shoppingLists.category', 'Category')}
        disabled={loading}
      />

      {/* Notes */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('shoppingLists.notes', 'Notes')}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, dynamicStyles.input]}
          value={formData.notes}
          onChangeText={(text) => handleChange('notes', text)}
          placeholder={t('shoppingLists.notesPlaceholder', 'Add any notes...')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={500}
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
