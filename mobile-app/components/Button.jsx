/**
 * Reusable Button (React Native).
 * Animated pressable with scale feedback, supports primary/secondary/outline and theme.
 * Uses react-native-reanimated for smooth press animations.
 */

import React from 'react';
import { Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import { BUTTON_SCALE } from '../utils/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const reducedMotion = useReducedMotion();
  
  // Animation shared value for scale
  const scale = useSharedValue(1);

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

  // Animated style for scale press effect
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Handle press animations
  const handlePressIn = () => {
    if (!reducedMotion && !disabled && !loading) {
      scale.value = withTiming(BUTTON_SCALE.pressed, { duration: BUTTON_SCALE.duration });
    }
  };

  const handlePressOut = () => {
    if (!reducedMotion && !disabled && !loading) {
      scale.value = withSpring(BUTTON_SCALE.released, { damping: 15, stiffness: 200 });
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bgColor,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
        animatedStyle,
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
    </AnimatedPressable>
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
