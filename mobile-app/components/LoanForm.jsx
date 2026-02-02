/**
 * LoanForm Component (React Native)
 * Form for creating/editing loans.
 * 
 * Features:
 * - Loan type selector (given/received)
 * - Borrower/Lender name
 * - Total and remaining amounts
 * - Due date picker
 * - Status selector
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
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import CurrencyInput from './CurrencyInput';
import DateInput from './DateInput';
import Dropdown from './Dropdown';
import Button from './Button';
import FormSection from './FormSection';

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function LoanForm({
  loan = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    type: loan?.type || 'given', // 'given' or 'received'
    name: loan?.name || loan?.borrowerName || loan?.lenderName || '',
    totalAmount: loan?.totalAmount || loan?.amount || '',
    remainingAmount: loan?.remainingAmount || loan?.amount || '',
    dueDate: loan?.dueDate ? loan.dueDate.split('T')[0] : '',
    status: loan?.status || 'active',
    description: loan?.description || '',
    interestRate: loan?.interestRate || '',
  });
  const [error, setError] = useState('');

  // Get translated status options
  const statusOptions = STATUS_OPTIONS.map(opt => ({
    ...opt,
    label: t(`loans.status.${opt.value}`, opt.label),
  }));

  /**
   * Handle field changes
   */
  const handleChange = useCallback((name, value) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-set remaining amount to total for new loans
      if (name === 'totalAmount' && !loan) {
        newData.remainingAmount = value;
      }
      
      return newData;
    });
    setError('');
  }, [loan]);

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
      setError(t('loans.nameRequired', 'Please enter a name'));
      return false;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      setError(t('loans.amountRequired', 'Please enter a valid amount'));
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
        id: loan?.id,
        totalAmount: parseFloat(formData.totalAmount),
        remainingAmount: parseFloat(formData.remainingAmount) || parseFloat(formData.totalAmount),
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : 0,
        // Map name to correct field based on type
        borrowerName: formData.type === 'given' ? formData.name : undefined,
        lenderName: formData.type === 'received' ? formData.name : undefined,
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
    typeBtn: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    typeBtnActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    typeBtnText: { color: theme.colors.textSecondary },
    typeBtnTextActive: { color: theme.colors.primary },
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

      {/* Loan Type Toggle */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('loans.type', 'Loan Type')} *
        </Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              dynamicStyles.typeBtn,
              formData.type === 'given' && dynamicStyles.typeBtnActive,
            ]}
            onPress={() => handleChange('type', 'given')}
            activeOpacity={0.7}
          >
            <ArrowUpRight
              size={20}
              color={formData.type === 'given' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.typeBtnText,
                dynamicStyles.typeBtnText,
                formData.type === 'given' && dynamicStyles.typeBtnTextActive,
              ]}
            >
              {t('loans.given', 'I Lent')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeBtn,
              dynamicStyles.typeBtn,
              formData.type === 'received' && dynamicStyles.typeBtnActive,
            ]}
            onPress={() => handleChange('type', 'received')}
            activeOpacity={0.7}
          >
            <ArrowDownLeft
              size={20}
              color={formData.type === 'received' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.typeBtnText,
                dynamicStyles.typeBtnText,
                formData.type === 'received' && dynamicStyles.typeBtnTextActive,
              ]}
            >
              {t('loans.received', 'I Borrowed')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Name (Borrower/Lender) */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {formData.type === 'given'
            ? t('loans.borrowerName', 'Borrower Name')
            : t('loans.lenderName', 'Lender Name')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder={formData.type === 'given'
            ? t('loans.borrowerPlaceholder', 'Who did you lend to?')
            : t('loans.lenderPlaceholder', 'Who did you borrow from?')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          maxLength={100}
        />
      </View>

      {/* Total Amount */}
      <CurrencyInput
        value={formData.totalAmount}
        onChange={(value) => handleChange('totalAmount', value)}
        label={`${t('loans.totalAmount', 'Total Amount')} *`}
        placeholder="0.00"
        disabled={loading}
        quickAmounts={[100, 500, 1000, 5000]}
      />

      {/* Remaining Amount */}
      {loan && (
        <CurrencyInput
          value={formData.remainingAmount}
          onChange={(value) => handleChange('remainingAmount', value)}
          label={t('loans.remainingAmount', 'Remaining Amount')}
          placeholder="0.00"
          disabled={loading}
          quickAmounts={[]}
        />
      )}

      {/* Additional Details */}
      <FormSection
        title={t('loans.additionalDetails', 'Additional Details')}
        collapsible
        defaultExpanded={!!(formData.dueDate || formData.description || loan)}
      >
        {/* Due Date — allow future dates for loan due date */}
        <DateInput
          value={formData.dueDate}
          onChange={handleEventChange}
          name="dueDate"
          label={t('loans.dueDate', 'Due Date')}
          disabled={loading}
          showQuickButtons={false}
          maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 10))}
        />

        {/* Status */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('loans.statusLabel', 'Status')}
          </Text>
          <Dropdown
            value={formData.status}
            onChange={(value) => handleChange('status', value)}
            options={statusOptions}
            placeholder={t('loans.selectStatus', 'Select status')}
            disabled={loading}
          />
        </View>

        {/* Interest Rate */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('loans.interestRate', 'Interest Rate (%)')}
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={String(formData.interestRate)}
            onChangeText={(text) => handleChange('interestRate', text.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Description */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('loans.description', 'Notes')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, dynamicStyles.input]}
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
            placeholder={t('loans.descriptionPlaceholder', 'Add any notes...')}
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
  typeToggle: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  typeBtnText: {
    ...typography.label,
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
