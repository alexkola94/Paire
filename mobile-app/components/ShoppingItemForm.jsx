/**
 * ShoppingItemForm Component (React Native)
 * Form for creating/editing shopping list items.
 * 
 * Features:
 * - Item name
 * - Quantity and unit
 * - Estimated price
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
import CurrencyInput from './CurrencyInput';
import CategorySelector from './CategorySelector';
import Dropdown from './Dropdown';
import Button from './Button';

// Item categories
const ITEM_CATEGORIES = [
  'groceries', 'household', 'personal', 'electronics', 'clothing', 'other'
];

// Unit options (labels translated via shoppingLists.units.*)
const UNIT_OPTIONS = [
  { value: 'pcs', labelKey: 'shoppingLists.units.pcs' },
  { value: 'kg', labelKey: 'shoppingLists.units.kg' },
  { value: 'g', labelKey: 'shoppingLists.units.g' },
  { value: 'L', labelKey: 'shoppingLists.units.L' },
  { value: 'mL', labelKey: 'shoppingLists.units.mL' },
  { value: 'pack', labelKey: 'shoppingLists.units.pack' },
  { value: 'box', labelKey: 'shoppingLists.units.box' },
];

export default function ShoppingItemForm({
  item = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    name: item?.name || '',
    quantity: item?.quantity || '1',
    unit: item?.unit || 'pcs',
    estimatedPrice: item?.estimatedPrice || '',
    category: item?.category || '',
    notes: item?.notes || '',
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
      setError(t('shoppingLists.itemNameRequired', 'Please enter an item name'));
      return false;
    }
    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty < 1) {
      setError(t('shoppingLists.quantityRequired', 'Please enter a valid quantity'));
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
        id: item?.id,
        quantity: parseInt(formData.quantity),
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : null,
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

      {/* Item Name */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('shoppingLists.itemName', 'Item Name')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder={t('shoppingLists.itemPlaceholder', 'e.g., Milk, Bread')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          maxLength={100}
        />
      </View>

      {/* Quantity and Unit Row */}
      <View style={styles.row}>
        <View style={[styles.fieldWrapper, styles.quantityField]}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('shoppingLists.quantity', 'Qty')} *
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={String(formData.quantity)}
            onChangeText={(text) => handleChange('quantity', text.replace(/[^0-9]/g, ''))}
            placeholder="1" // i18n-ignore: numeric
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        <View style={[styles.fieldWrapper, styles.unitField]}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('shoppingLists.unit', 'Unit')}
          </Text>
          <Dropdown
            value={formData.unit}
            onChange={(value) => handleChange('unit', value)}
            options={UNIT_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
            placeholder={t('shoppingLists.units.pcs', 'pcs')}
            disabled={loading}
          />
        </View>
      </View>

      {/* Estimated Price */}
      <CurrencyInput
        value={formData.estimatedPrice}
        onChange={(value) => handleChange('estimatedPrice', value)}
        label={t('shoppingLists.estimatedPrice', 'Estimated Price')}
        disabled={loading}
        quickAmounts={[1, 5, 10, 20]}
      />

      {/* Category */}
      <CategorySelector
        value={formData.category}
        onChange={handleEventChange}
        name="category"
        type="expense"
        categories={ITEM_CATEGORIES}
        label={t('shoppingLists.category', 'Category')}
        disabled={loading}
      />

      {/* Notes */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('shoppingLists.itemNotes', 'Notes')}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, dynamicStyles.input]}
          value={formData.notes}
          onChangeText={(text) => handleChange('notes', text)}
          placeholder={t('shoppingLists.itemNotesPlaceholder', 'e.g., Brand preference...')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          maxLength={200}
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
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quantityField: {
    flex: 1,
  },
  unitField: {
    flex: 2,
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
