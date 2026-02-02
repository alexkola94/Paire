/**
 * BottomSheetMenu Component
 * 
 * Reusable bottom sheet with glassmorphism styling and spring animations.
 * Features gesture-based dismiss, smooth transitions, and accessibility support.
 * Follows the Paire "Harmonious Minimalist" design system.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Animation constants - snappier, faster animations
const SPRING_DAMPING = 18;
const SPRING_STIFFNESS = 280;
const DISMISS_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 400;

export default function BottomSheetMenu({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 0.7, // Percentage of screen height
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Calculate max height based on screen and safe area
  const sheetMaxHeight = SCREEN_HEIGHT * maxHeight;

  // Animation shared values
  const translateY = useSharedValue(sheetMaxHeight);
  const overlayOpacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  // Open animation
  useEffect(() => {
    if (isOpen) {
      if (reducedMotion) {
        translateY.value = 0;
        overlayOpacity.value = 0.5;
        scale.value = 1;
      } else {
        translateY.value = withSpring(0, {
          damping: SPRING_DAMPING,
          stiffness: SPRING_STIFFNESS,
        });
        overlayOpacity.value = withTiming(0.5, { duration: 150 });
        scale.value = withSpring(1, {
          damping: SPRING_DAMPING,
          stiffness: SPRING_STIFFNESS,
        });
      }
    }
  }, [isOpen]);

  // Close animation
  const handleClose = useCallback(() => {
    if (reducedMotion) {
      onClose();
      return;
    }

    translateY.value = withSpring(sheetMaxHeight, {
      damping: SPRING_DAMPING,
      stiffness: SPRING_STIFFNESS,
    });
    overlayOpacity.value = withTiming(0, { duration: 120 });
    scale.value = withTiming(0.95, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, sheetMaxHeight, reducedMotion]);

  // Pan gesture for drag-to-dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging down
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        // Fade overlay as sheet is dragged
        overlayOpacity.value = interpolate(
          event.translationY,
          [0, sheetMaxHeight],
          [0.5, 0],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      // Dismiss if dragged past threshold or with high velocity
      if (
        event.translationY > DISMISS_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD
      ) {
        runOnJS(handleClose)();
      } else {
        // Snap back to open position
        translateY.value = withSpring(0, {
          damping: SPRING_DAMPING,
          stiffness: SPRING_STIFFNESS,
        });
        overlayOpacity.value = withTiming(0.5, { duration: 150 });
      }
    });

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, 50],
      [1, 0.5],
      Extrapolation.CLAMP
    ),
  }));

  if (!isOpen) return null;

  // Theme-aware styles
  const dynamicStyles = {
    sheetBg: theme.dark
      ? 'rgba(15, 7, 26, 0.95)'
      : 'rgba(255, 255, 255, 0.92)',
    sheetBorder: theme.dark
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)',
    handleBar: theme.dark
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.2)',
    titleColor: theme.colors.text,
  };

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      {/* Overlay backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View
          style={[
            styles.overlay,
            overlayAnimatedStyle,
            { backgroundColor: theme.dark ? '#000' : '#0F071A' },
          ]}
        />
      </Pressable>

      {/* Bottom sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: dynamicStyles.sheetBg,
              borderColor: dynamicStyles.sheetBorder,
            },
          ]}
        >
          {/* Handle bar for drag gesture */}
          <Animated.View
            style={[
              styles.handleBarContainer,
              handleBarAnimatedStyle,
            ]}
          >
            <View
              style={[
                styles.handleBar,
                { backgroundColor: dynamicStyles.handleBar },
              ]}
            />
          </Animated.View>

          {/* Optional title */}
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: dynamicStyles.titleColor }]}>
                {title}
              </Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    // Glassmorphism shadow
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
