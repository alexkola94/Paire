/**
 * SuccessAnimation Component
 * 
 * Displays an animated success indicator with checkmark.
 * Features:
 * - Animated circle with scale-in effect
 * - Animated checkmark stroke
 * - Optional confetti effect for achievements
 * - Theme-aware colors
 * - Respects reduced motion setting
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  useReducedMotion,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../constants/theme';

// Create animated SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Confetti particle colors
const CONFETTI_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

/**
 * Single confetti particle
 */
function ConfettiParticle({ delay, color, startX, startY }) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (reducedMotion) return;
    
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) })
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [0, (Math.random() - 0.5) * 100]);
    const translateY = interpolate(progress.value, [0, 1], [0, -80 + Math.random() * 40]);
    const opacity = interpolate(progress.value, [0, 0.8, 1], [1, 1, 0]);
    const scale = interpolate(progress.value, [0, 0.3, 1], [0, 1, 0.5]);
    const rotate = interpolate(progress.value, [0, 1], [0, 360 * (Math.random() > 0.5 ? 1 : -1)]);
    
    return {
      opacity,
      transform: [
        { translateX: startX + translateX },
        { translateY: startY + translateY },
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });
  
  return (
    <Animated.View
      style={[
        styles.confetti,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

export default function SuccessAnimation({
  size = 80,
  showConfetti = false,
  message,
  onAnimationComplete,
  autoHide = false,
  hideDelay = 2000,
}) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  
  // Animation shared values
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  
  // Checkmark path dimensions
  const checkmarkPath = `M ${size * 0.25} ${size * 0.5} L ${size * 0.42} ${size * 0.65} L ${size * 0.75} ${size * 0.35}`;
  const strokeWidth = size * 0.08;
  
  // Run animations on mount
  useEffect(() => {
    if (reducedMotion) {
      // Instant state for reduced motion
      circleScale.value = 1;
      circleOpacity.value = 1;
      checkProgress.value = 1;
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return;
    }
    
    // Circle animation
    circleScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    circleOpacity.value = withTiming(1, { duration: 200 });
    
    // Checkmark animation (delayed)
    checkProgress.value = withDelay(
      250,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    
    // Pulse animation
    pulseScale.value = withDelay(
      600,
      withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 12 })
      )
    );
    
    // Callback when complete
    if (onAnimationComplete) {
      setTimeout(() => {
        runOnJS(onAnimationComplete)();
      }, 800);
    }
    
    // Auto-hide logic
    if (autoHide) {
      setTimeout(() => {
        setVisible(false);
      }, hideDelay);
    }
  }, []);
  
  // Circle animated style
  const circleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [
      { scale: circleScale.value * pulseScale.value },
    ],
  }));
  
  // Checkmark animated props
  const checkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(checkProgress.value, [0, 1], [size, 0]),
  }));
  
  if (!visible) return null;
  
  // Generate confetti particles
  const confettiParticles = showConfetti
    ? Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: 200 + Math.random() * 200,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        startX: 0,
        startY: 0,
      }))
    : [];
  
  return (
    <View style={styles.container}>
      {/* Confetti */}
      {showConfetti && (
        <View style={styles.confettiContainer}>
          {confettiParticles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              delay={particle.delay}
              color={particle.color}
              startX={particle.startX}
              startY={particle.startY}
            />
          ))}
        </View>
      )}
      
      {/* Success Circle + Checkmark */}
      <Animated.View style={[styles.svgContainer, circleAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth}
            fill={theme.colors.success}
          />
          
          {/* Checkmark */}
          <AnimatedPath
            d={checkmarkPath}
            stroke="#FFFFFF"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={size}
            animatedProps={checkAnimatedProps}
          />
        </Svg>
      </Animated.View>
      
      {/* Optional message */}
      {message && (
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  confettiContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
