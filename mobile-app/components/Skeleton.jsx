/**
 * Skeleton placeholder for loading content.
 * Features smooth shimmer animation using react-native-reanimated.
 * Includes preset layouts for common UI patterns.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing } from '../constants/theme';

/**
 * Single skeleton element with shimmer animation
 */
export default function Skeleton({
  type = 'text',
  width,
  height,
  style = {},
  shimmer = true,
}) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const shimmerProgress = useSharedValue(0);

  // Start shimmer animation
  useEffect(() => {
    if (shimmer && !reducedMotion) {
      shimmerProgress.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [shimmer, reducedMotion]);

  // Animated style for shimmer
  const shimmerStyle = useAnimatedStyle(() => {
    if (!shimmer || reducedMotion) {
      return { opacity: 0.6 };
    }
    
    const opacity = interpolate(
      shimmerProgress.value,
      [0, 0.5, 1],
      [0.4, 0.7, 0.4]
    );
    
    return { opacity };
  });

  const baseStyle = [
    styles.base,
    {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    type === 'text' && styles.text,
    type === 'circular' && styles.circular,
    type === 'rectangular' && styles.rectangular,
    type === 'card' && styles.card,
    type === 'button' && styles.button,
    type === 'avatar' && styles.avatar,
    width != null && { width },
    height != null && { height },
    style,
    shimmerStyle,
  ];

  return <Animated.View style={baseStyle} />;
}

/**
 * Transaction skeleton preset
 */
export function SkeletonTransaction() {
  const { theme } = useTheme();
  
  return (
    <View style={[skeletonStyles.transaction, { borderBottomColor: theme.colors.glassBorder }]}>
      <Skeleton type="circular" width={40} height={40} />
      <View style={skeletonStyles.transactionContent}>
        <Skeleton type="text" width="60%" height={14} />
        <Skeleton type="text" width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
      <Skeleton type="text" width={70} height={16} />
    </View>
  );
}

/**
 * Budget progress skeleton preset
 */
export function SkeletonBudget() {
  return (
    <View style={skeletonStyles.budget}>
      <View style={skeletonStyles.budgetHeader}>
        <Skeleton type="text" width="40%" height={14} />
        <Skeleton type="text" width={60} height={12} />
      </View>
      <Skeleton type="rectangular" height={8} style={{ borderRadius: 4, marginTop: 8 }} />
    </View>
  );
}

/**
 * Widget skeleton preset
 */
export function SkeletonWidget() {
  const { theme } = useTheme();
  
  return (
    <View style={[skeletonStyles.widget, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
      <View style={skeletonStyles.widgetHeader}>
        <Skeleton type="circular" width={24} height={24} />
        <Skeleton type="text" width="50%" height={16} />
      </View>
      <View style={skeletonStyles.widgetBody}>
        <Skeleton type="text" width="80%" height={12} />
        <Skeleton type="text" width="60%" height={12} />
        <Skeleton type="text" width="70%" height={12} />
      </View>
    </View>
  );
}

/**
 * Card skeleton preset
 */
export function SkeletonCard() {
  const { theme } = useTheme();
  
  return (
    <View style={[skeletonStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
      <Skeleton type="rectangular" height={120} style={{ borderRadius: borderRadius.md }} />
      <View style={skeletonStyles.cardContent}>
        <Skeleton type="text" width="70%" height={16} />
        <Skeleton type="text" width="50%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * List of skeleton items
 */
export function SkeletonList({ count = 5, type = 'transaction' }) {
  const SkeletonComponent = {
    transaction: SkeletonTransaction,
    budget: SkeletonBudget,
    widget: SkeletonWidget,
    card: SkeletonCard,
  }[type] || SkeletonTransaction;
  
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  text: {
    height: 16,
    width: '100%',
    marginBottom: 4,
  },
  circular: {
    width: 40,
    height: 40,
    borderRadius: 9999,
  },
  rectangular: {
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.md,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

const skeletonStyles = StyleSheet.create({
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  budget: {
    marginBottom: spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widget: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  widgetBody: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.md,
  },
  list: {
    gap: 0,
  },
});
