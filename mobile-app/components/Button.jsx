/**
 * Reusable Button (React Native).
 * TouchableOpacity + Text; supports primary/secondary/outline and theme.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function Button({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
}) {
  const { theme } = useTheme();

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  const bgColor = isPrimary
    ? theme.colors.primary
    : isOutline
    ? 'transparent'
    : theme.colors.surfaceSecondary;
  const borderWidth = isOutline ? 2 : 0;
  const borderColor = theme.colors.primary;
  const textColor = isPrimary ? '#fff' : theme.colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.btn,
        {
          backgroundColor: bgColor,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {LeftIcon && <LeftIcon size={18} color={textColor} style={styles.iconLeft} />}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
          {RightIcon && <RightIcon size={18} color={textColor} style={styles.iconRight} />}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  text: {
    ...typography.label,
  },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
});
