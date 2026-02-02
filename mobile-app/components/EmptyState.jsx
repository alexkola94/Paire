/**
 * EmptyState Component
 * Reusable empty state with icon, title, description, and optional CTA button.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function EmptyState({ icon: Icon, iconSize = 48, title, description, ctaLabel, onPress }) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {Icon && (
        <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.primary}10` }]}>
          <Icon size={iconSize} color={theme.colors.textLight} />
        </View>
      )}
      {title && (
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      )}
      {description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      )}
      {ctaLabel && onPress && (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.colors.primary }]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  ctaText: {
    ...typography.body,
    fontWeight: '600',
    color: '#ffffff',
  },
});
