/**
 * Currency input (React Native).
 * Ported from frontend CurrencyInput; TextInput with format/parse and optional quick amounts.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

function formatCurrency(num) {
  if (num !== 0 && !num) return '';
  const n = typeof num === 'string' ? parseFloat(String(num).replace(/[^\d.-]/g, '')) : num;
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function parseCurrency(str) {
  if (!str) return '';
  const normalized = String(str).replace(/,/g, '.');
  const cleaned = normalized.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
}

export default function CurrencyInput({
  value = '',
  onChange,
  label,
  placeholder: placeholderProp,
  disabled = false,
  quickAmounts = [10, 50, 100, 500],
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Use translated default when no placeholder is passed
  const placeholder = placeholderProp ?? t('common.amountPlaceholder', '0.00');
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value !== '' && value != null && !isFocused) {
      setDisplayValue(formatCurrency(value));
    } else if ((!value || value === '') && !isFocused) {
      setDisplayValue('');
    }
  }, [value, isFocused]);

  const handleChangeText = (text) => {
    const parsed = parseCurrency(text);
    setDisplayValue(text);
    const num = parsed ? parseFloat(parsed) : '';
    onChange?.(num);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value !== '' && value != null) {
      setDisplayValue(formatCurrency(value));
    }
  };

  const handleQuickAmount = (amount) => {
    const next = value ? parseFloat(value) + amount : amount;
    setDisplayValue(formatCurrency(next));
    onChange?.(next);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.surfaceSecondary,
            color: theme.colors.text,
          },
        ]}
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textLight}
        editable={!disabled}
        keyboardType="decimal-pad"
      />
      {Array.isArray(quickAmounts) && quickAmounts.length > 0 && (
        <View style={styles.quickRow}>
          {quickAmounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.quickBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
              onPress={() => handleQuickAmount(amount)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickText, { color: theme.colors.primary }]}>+{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm, // Reduced from spacing.lg for compact layout
    width: '100%',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingVertical: 10, // Reduced from 12
    paddingHorizontal: spacing.md,
    fontSize: 16, // Reduced from 18
    minHeight: 46, // Reduced from 52
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs, // Reduced from spacing.sm
    marginTop: spacing.xs, // Reduced from spacing.sm
  },
  quickBtn: {
    paddingVertical: spacing.xs, // Reduced from spacing.sm
    paddingHorizontal: spacing.sm, // Reduced from spacing.md
    borderRadius: borderRadius.sm,
  },
  quickText: {
    ...typography.bodySmall, // Smaller text
    fontWeight: '600',
  },
});
