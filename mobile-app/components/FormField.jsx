/**
 * FormField wrapper for TextInput with label, validation, help text.
 * Ported from frontend FormField; uses View/Text/TextInput and StyleSheet.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { validateField, getCharacterCount, getWordCount } from '../utils/validation';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function FormField({
  label,
  name,
  id,
  type = 'text',
  value,
  onChangeText,
  onBlur,
  rules = [],
  required = false,
  disabled = false,
  placeholder,
  helpText,
  showCharacterCount = false,
  showWordCount = false,
  maxLength,
  minLength,
  validateOnChange = true,
  validateOnBlur = true,
  ...inputProps
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [validationResult, setValidationResult] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const validationRules = [
    ...rules,
    ...(required ? [{ type: 'required', params: [], message: t('validation.required', { field: label }) }] : []),
    ...(minLength ? [{ type: 'minLength', params: [minLength], message: t('validation.minLength', { min: minLength, field: label }) }] : []),
    ...(maxLength ? [{ type: 'maxLength', params: [maxLength], message: t('validation.maxLength', { max: maxLength, field: label }) }] : []),
  ];

  const validate = (val = value) => {
    if (validationRules.length === 0) {
      setValidationResult(null);
      return true;
    }
    const result = validateField(val, validationRules);
    setValidationResult(result);
    return result.isValid;
  };

  const handleChangeText = (text) => {
    onChangeText?.(text);
    if (validateOnChange && hasInteracted) validate(text);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasInteracted(true);
    if (validateOnBlur) validate();
    onBlur?.();
  };

  useEffect(() => {
    if (value && validationRules.length > 0) validate();
  }, []);

  const getValidationIcon = () => {
    if (!validationResult || !hasInteracted) return null;
    const color =
      validationResult.type === 'success'
        ? theme.colors.success
        : validationResult.type === 'error'
        ? theme.colors.error
        : theme.colors.warning;
    if (validationResult.type === 'success')
      return <CheckCircle size={18} color={color} style={styles.validationIcon} />;
    if (validationResult.type === 'error' || validationResult.type === 'warning')
      return <AlertCircle size={18} color={color} style={styles.validationIcon} />;
    return <Info size={18} color={theme.colors.info} style={styles.validationIcon} />;
  };

  const characterCount = showCharacterCount ? getCharacterCount(value) : null;
  const wordCount = showWordCount ? getWordCount(value) : null;
  const inputId = id || name;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor:
              validationResult && !validationResult.isValid && hasInteracted
                ? theme.colors.error
                : isFocused
                ? theme.colors.primary
                : theme.colors.surfaceSecondary,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
          ]}
          id={inputId}
          value={value || ''}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          editable={!disabled}
          maxLength={maxLength}
          secureTextEntry={type === 'password'}
          keyboardType={type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default'}
          {...inputProps}
        />
        {getValidationIcon()}
      </View>
      {(helpText || validationResult?.message || validationResult?.messageKey) && (
        <Text
          style={[
            styles.message,
            {
              color: validationResult?.type === 'error' ? theme.colors.error : theme.colors.textSecondary,
            },
          ]}
        >
          {validationResult?.messageKey
            ? t(validationResult.messageKey, { field: label, ...validationResult.messageParams })
            : validationResult?.message || helpText}
        </Text>
      )}
      {(showCharacterCount || showWordCount) && (
        <View style={styles.countRow}>
          {showCharacterCount && (
            <Text style={[styles.count, { color: theme.colors.textLight }]}>
              {characterCount}
              {maxLength ? ` / ${maxLength}` : ''}
            </Text>
          )}
          {showWordCount && (
            <Text style={[styles.count, { color: theme.colors.textLight }]}>
              {wordCount} {t('validation.words')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
    width: '100%',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  required: {
    color: '#e74c3c',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontSize: 16,
    minHeight: 48,
  },
  validationIcon: {
    marginLeft: spacing.sm,
  },
  message: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  count: {
    ...typography.caption,
  },
});
