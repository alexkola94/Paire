/**
 * SplashScreen Component
 * 
 * Branded loading screen shown on app launch.
 * Features the Paire logo with a gentle pulse animation.
 * Follows the Paire "Harmonious Minimalist" design system.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  withDelay,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, colors } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Logo dimensions
const LOGO_SIZE = 120;

/**
 * Paire Logo Component
 * Renders the interlocking P shapes with gradients
 */
function PaireLogo({ size = LOGO_SIZE }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
    >
      <Defs>
        {/* Deep purple gradient */}
        <LinearGradient id="paireGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
          <Stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
        </LinearGradient>
        {/* Slate accent gradient */}
        <LinearGradient id="paireGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
          <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Left shape - solid block */}
      <Path
        d="M45 40 
           L45 160 
           L75 160 
           L75 115 
           L95 115 
           Q120 115, 120 85 
           Q120 55, 95 55 
           L75 55 
           L75 40 Z
           M75 75 L90 75 Q100 75, 100 85 Q100 95, 90 95 L75 95 Z"
        fill="url(#paireGrad1)"
        fillRule="evenodd"
      />

      {/* Right shape - offset geometric form */}
      <Path
        d="M85 50 
           L85 170 
           L115 170 
           L115 125 
           L135 125 
           Q160 125, 160 95 
           Q160 65, 135 65 
           L115 65 
           L115 50 Z
           M115 85 L130 85 Q140 85, 140 95 Q140 105, 130 105 L115 105 Z"
        fill="url(#paireGrad2)"
        fillRule="evenodd"
        opacity="0.85"
      />
    </Svg>
  );
}

/**
 * Main SplashScreen Component
 */
export default function SplashScreen({ onFinish, minDuration = 2000 }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  // Animation values
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);

  // Start animations on mount
  useEffect(() => {
    // Logo pulse animation (gentle scale)
    if (!reducedMotion) {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite repeat
        true // Reverse
      );

      // Ring pulse animation
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 1500, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );

      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    }

    // Fade in tagline after a short delay
    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
    );

    // Set timeout for minimum duration, then trigger fade out
    const timer = setTimeout(() => {
      // Fade out animation
      containerOpacity.value = withTiming(
        0,
        { duration: 300, easing: Easing.in(Easing.ease) },
        (finished) => {
          if (finished && onFinish) {
            runOnJS(onFinish)();
          }
        }
      );
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinish, reducedMotion]);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: interpolate(textOpacity.value, [0, 1], [10, 0]),
      },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        containerAnimatedStyle,
      ]}
    >
      {/* Logo with pulse animation */}
      <View style={styles.logoContainer}>
        {/* Animated ring behind logo */}
        <Animated.View
          style={[
            styles.ring,
            { borderColor: theme.colors.primary },
            ringAnimatedStyle,
          ]}
        />

        {/* Logo */}
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <PaireLogo size={LOGO_SIZE} />
        </Animated.View>
      </View>

      {/* App name and tagline (translated) */}
      <Animated.View style={textAnimatedStyle}>
        <Text style={[styles.appName, { color: theme.colors.text }]}>
          {t('app.title')}
        </Text>
        <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
          {t('app.tagline')}
        </Text>
      </Animated.View>

      {/* Subtle loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDots}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 200} theme={theme} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Loading dot with staggered animation
 */
function LoadingDot({ delay, theme }) {
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1,
          true
        )
      );
    }
  }, [delay, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: theme.colors.primary },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    position: 'relative',
    width: LOGO_SIZE + 40,
    height: LOGO_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoWrapper: {
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE + 30,
    height: LOGO_SIZE + 30,
    borderRadius: (LOGO_SIZE + 30) / 2,
    borderWidth: 2,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
