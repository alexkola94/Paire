/**
 * AnimatedCard Component
 * 
 * A wrapper component that provides entrance animations for cards.
 * Features:
 * - Fade-in with scale animation on mount
 * - Staggered animation support for lists
 * - Theme-aware glassmorphism styling
 * - Respects reduced motion accessibility setting
 */

import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../constants/theme';
import { SPRING_CONFIG, getStaggerDelay } from '../utils/animations';

export default function AnimatedCard({
  children,
  index = 0,
  stagger = true,
  onPress,
  style,
  containerStyle,
  animationDelay = 0,
  disabled = false,
}) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  
  // Animation shared values
  const progress = useSharedValue(0);
  const pressed = useSharedValue(1);
  
  // Calculate stagger delay
  const staggerDelay = stagger ? getStaggerDelay(index, 60, 400) : 0;
  const totalDelay = animationDelay + staggerDelay;
  
  // Run entrance animation on mount
  useEffect(() => {
    if (reducedMotion) {
      // Skip animation if reduced motion is enabled
      progress.value = 1;
    } else {
      progress.value = withDelay(
        totalDelay,
        withSpring(1, SPRING_CONFIG.gentle)
      );
    }
  }, []);
  
  // Animated style for entrance
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1]);
    const translateY = interpolate(progress.value, [0, 1], [20, 0]);
    const scale = interpolate(progress.value, [0, 1], [0.95, 1]);
    
    // Press scale animation
    const pressScale = pressed.value;
    
    return {
      opacity,
      transform: [
        { translateY },
        { scale: scale * pressScale },
      ],
    };
  });
  
  // Handle press animation
  const handlePressIn = () => {
    if (!reducedMotion && onPress) {
      pressed.value = withTiming(0.97, { duration: 100 });
    }
  };
  
  const handlePressOut = () => {
    if (!reducedMotion && onPress) {
      pressed.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  };
  
  // Dynamic theme styles
  const dynamicStyles = {
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.glassBorder,
    },
  };
  
  const CardContent = (
    <Animated.View
      style={[
        styles.card,
        dynamicStyles.card,
        shadows.sm,
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
  
  // If onPress is provided, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={containerStyle}
      >
        {CardContent}
      </Pressable>
    );
  }
  
  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});
