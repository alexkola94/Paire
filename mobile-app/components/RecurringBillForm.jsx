/**
 * RecurringBillForm Component (React Native)
 * Form for creating/editing recurring bills (desktop parity).
 * - Loan link when category = loan
 * - Savings goal link when category = savings
 * - Notes with [LOAN_REF:id] / [SAVINGS_REF:id] on submit
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import { loanService, savingsGoalService } from '../services/api';
import CurrencyInput from './CurrencyInput';
import CategorySelector from './CategorySelector';
import Dropdown from './Dropdown';
import Button from './Button';
import FormSection from './FormSection';

// Bill categories (include savings for linking to savings goals — desktop parity)
const BILL_CATEGORIES = [
  'housing', 'utilities', 'subscription', 'insurance', 'rent',
  'loan', 'savings', 'internet', 'phone', 'gym', 'other'
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringBillForm({
  bill = null,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Loans and savings goals for link dropdowns (desktop parity)
  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => loanService.getAll(),
  });
  const { data: savingsGoals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: () => savingsGoalService.getAll(),
  });

  // Active only: not settled / not achieved
  const activeLoans = (loans || []).filter((l) => !(l.isSettled ?? l.is_settled));
  const activeSavingsGoals = (savingsGoals || []).filter((g) => !(g.isAchieved ?? g.is_achieved));

  // Parse bill.notes for LOAN_REF and SAVINGS_REF when editing
  const getInitialFormState = useCallback(() => {
    const loanRefMatch = bill?.notes?.match(/\[LOAN_REF:([^\]]+)\]/);
    const savingsRefMatch = bill?.notes?.match(/\[SAVINGS_REF:([^\]]+)\]/);
    let displayNotes = (bill?.notes || '').replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').replace(/\[SAVINGS_REF:[^\]]+\]\s*/g, '').trim();
    return {
      name: bill?.name || '',
      amount: bill?.amount ?? '',
      category: bill?.category || '',
      frequency: bill?.frequency || 'monthly',
      dueDay: (bill?.dueDay ?? bill?.due_day ?? '1').toString(),
      reminderDays: (bill?.reminderDays ?? bill?.reminder_days ?? '3').toString(),
      autoPay: bill?.autoPay ?? bill?.auto_pay ?? false,
      isActive: bill?.isActive ?? bill?.is_active ?? true,
      notes: displayNotes,
      loanId: loanRefMatch?.[1] || '',
      savingsGoalId: savingsRefMatch?.[1] || '',
    };
  }, [bill]);

  const [formData, setFormData] = useState(getInitialFormState);
  const [error, setError] = useState('');

  // Reset form when bill changes (e.g. switch from create to edit)
  useEffect(() => {
    setFormData(getInitialFormState());
  }, [bill?.id, getInitialFormState]);

  // Get translated frequency options
  const frequencyOptions = FREQUENCY_OPTIONS.map(opt => ({
    ...opt,
    label: t(`recurringBills.frequency.${opt.value}`, opt.label),
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
      setError(t('recurringBills.nameRequired', 'Please enter a bill name'));
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError(t('recurringBills.amountRequired', 'Please enter a valid amount'));
      return false;
    }
    if (!formData.category) {
      setError(t('recurringBills.categoryRequired', 'Please select a category'));
      return false;
    }
    const dueDay = parseInt(formData.dueDay);
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      setError(t('recurringBills.dueDayRequired', 'Please enter a valid due day (1-31)'));
      return false;
    }
    return true;
  };

  /**
   * Handle form submission — build notes with LOAN_REF/SAVINGS_REF (desktop parity)
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      let notes = (formData.notes || '').replace(/\[LOAN_REF:[^\]]+\]\s*/g, '').replace(/\[SAVINGS_REF:[^\]]+\]\s*/g, '').trim();
      if (formData.category === 'loan' && formData.loanId) {
        notes = `${notes} [LOAN_REF:${formData.loanId}]`.trim();
      }
      if (formData.category === 'savings' && formData.savingsGoalId) {
        notes = `${notes} [SAVINGS_REF:${formData.savingsGoalId}]`.trim();
      }

      const submitData = {
        ...formData,
        notes,
        id: bill?.id,
        amount: parseFloat(formData.amount),
        dueDay: parseInt(formData.dueDay),
        reminderDays: parseInt(formData.reminderDays) || 3,
      };
      delete submitData.loanId;
      delete submitData.savingsGoalId;

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
    switchRow: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    switchLabel: { color: theme.colors.text },
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

      {/* Bill Name */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('recurringBills.billName', 'Bill Name')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          placeholder={t('recurringBills.namePlaceholder', 'e.g., Netflix, Rent')}
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          maxLength={100}
        />
      </View>

      {/* Amount */}
      <CurrencyInput
        value={formData.amount}
        onChange={(value) => handleChange('amount', value)}
        label={`${t('recurringBills.amount', 'Amount')} *`}
        placeholder="0.00"
        disabled={loading}
        quickAmounts={[10, 20, 50, 100]}
      />

      {/* Category */}
      <CategorySelector
        value={formData.category}
        onChange={handleEventChange}
        name="category"
        type="expense"
        categories={BILL_CATEGORIES}
        label={`${t('recurringBills.category', 'Category')} *`}
        required
        disabled={loading}
      />

      {/* Loan link (desktop parity) — only when category = loan and active loans exist */}
      {formData.category === 'loan' && activeLoans.length > 0 && (
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('recurringBills.linkToLoan', 'Link to Loan')}
          </Text>
          <Dropdown
            value={formData.loanId}
            onChange={(value) => handleChange('loanId', value)}
            options={[
              { value: '', label: `-- ${t('recurringBills.selectLoan', 'Select loan')} --` },
              ...activeLoans.map((loan) => {
                const isGiven = (loan.lentBy ?? loan.lent_by) === 'Me';
                const partyName = isGiven ? (loan.borrowedBy ?? loan.borrowed_by) : (loan.lentBy ?? loan.lent_by);
                const type = isGiven ? t('loans.moneyLentShort', 'Lent') : t('loans.moneyBorrowedShort', 'Borrowed');
                const remaining = loan.remainingAmount ?? loan.remaining_amount ?? 0;
                const label = `${partyName || 'Loan'} (${type}) - €${Number(remaining).toFixed(2)}`;
                return { value: loan.id, label };
              }),
            ]}
            placeholder={t('recurringBills.selectLoan', 'Select loan')}
            disabled={loading}
          />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {t('recurringBills.loanHint', 'Marking this bill paid will create a loan payment.')}
          </Text>
        </View>
      )}

      {/* Savings goal link (desktop parity) — only when category = savings and active goals exist */}
      {formData.category === 'savings' && activeSavingsGoals.length > 0 && (
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('recurringBills.linkToSavingsGoal', 'Link to Savings Goal')}
          </Text>
          <Dropdown
            value={formData.savingsGoalId}
            onChange={(value) => handleChange('savingsGoalId', value)}
            options={[
              { value: '', label: `-- ${t('recurringBills.selectSavingsGoal', 'Select goal')} --` },
              ...activeSavingsGoals.map((goal) => {
                const current = goal.currentAmount ?? goal.current_amount ?? 0;
                const target = goal.targetAmount ?? goal.target_amount ?? 0;
                const label = `${goal.name} - €${Number(current).toFixed(2)} / €${Number(target).toFixed(2)}`;
                return { value: goal.id, label };
              }),
            ]}
            placeholder={t('recurringBills.selectSavingsGoal', 'Select goal')}
            disabled={loading}
          />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {t('recurringBills.savingsGoalHint', 'Marking this bill paid will add a deposit to the goal.')}
          </Text>
        </View>
      )}

      {/* Frequency */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('recurringBills.frequencyLabel', 'Frequency')} *
        </Text>
        <Dropdown
          value={formData.frequency}
          onChange={(value) => handleChange('frequency', value)}
          options={frequencyOptions}
          placeholder={t('recurringBills.selectFrequency', 'Select frequency')}
          disabled={loading}
        />
      </View>

      {/* Due Day */}
      <View style={styles.fieldWrapper}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {t('recurringBills.dueDay', 'Due Day (1-31)')} *
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={String(formData.dueDay)}
          onChangeText={(text) => handleChange('dueDay', text.replace(/[^0-9]/g, '').slice(0, 2))}
          placeholder="1"
          placeholderTextColor={dynamicStyles.placeholder}
          editable={!loading}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      {/* Additional Settings */}
      <FormSection
        title={t('recurringBills.settings', 'Settings')}
        collapsible
        defaultExpanded={!!(formData.notes || bill)}
      >
        {/* Reminder Days */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('recurringBills.reminderDays', 'Remind days before due')}
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={String(formData.reminderDays)}
            onChangeText={(text) => handleChange('reminderDays', text.replace(/[^0-9]/g, ''))}
            placeholder="3"
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Auto-Pay Toggle */}
        <View style={[styles.switchRow, dynamicStyles.switchRow]}>
          <Text style={[styles.switchLabel, dynamicStyles.switchLabel]}>
            {t('recurringBills.autoPay', 'Auto-pay enabled')}
          </Text>
          <Switch
            value={formData.autoPay}
            onValueChange={(value) => handleChange('autoPay', value)}
            disabled={loading}
            trackColor={{ false: theme.colors.glassBorder, true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Active Toggle */}
        <View style={[styles.switchRow, dynamicStyles.switchRow]}>
          <Text style={[styles.switchLabel, dynamicStyles.switchLabel]}>
            {t('recurringBills.isActive', 'Bill is active')}
          </Text>
          <Switch
            value={formData.isActive}
            onValueChange={(value) => handleChange('isActive', value)}
            disabled={loading}
            trackColor={{ false: theme.colors.glassBorder, true: theme.colors.success }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('recurringBills.notes', 'Notes')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, dynamicStyles.input]}
            value={formData.notes}
            onChangeText={(text) => handleChange('notes', text)}
            placeholder={t('recurringBills.notesPlaceholder', 'Add any notes...')}
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
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  switchLabel: {
    ...typography.body,
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
