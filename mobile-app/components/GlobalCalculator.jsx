/**
 * Global Calculator Component (React Native)
 * Floating calculator accessible from anywhere in the app.
 * 
 * Behavior:
 * 1. Hidden by default - only small edge handle visible
 * 2. First tap on handle - reveals the FAB button
 * 3. Second tap on FAB - opens the calculator
 * 4. Auto-hides FAB after inactivity or when calculator closes
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calculator, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useCalculator } from '../context/CalculatorContext';
import { useOverlay } from '../context/OverlayContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Auto-hide delay in ms (hide FAB after this duration of inactivity)
const AUTO_HIDE_DELAY = 5000;

// Calculator button component
function CalcButton({ value, onPress, variant = 'number', theme, size = 'normal' }) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'operator':
        return { backgroundColor: theme.colors.primary + '20' };
      case 'function':
        return { backgroundColor: theme.colors.surfaceSecondary };
      case 'equals':
        return { backgroundColor: theme.colors.success };
      case 'clear':
        return { backgroundColor: theme.colors.error + '20' };
      default:
        return { backgroundColor: theme.colors.surface };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'operator':
        return { color: theme.colors.primary, fontWeight: '600' };
      case 'equals':
        return { color: '#ffffff', fontWeight: '700' };
      case 'clear':
        return { color: theme.colors.error, fontWeight: '600' };
      case 'function':
        return { color: theme.colors.text, fontWeight: '500' };
      default:
        return { color: theme.colors.text, fontWeight: '500' };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.calcButton,
        getButtonStyle(),
        size === 'wide' && styles.calcButtonWide,
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      {typeof value === 'string' ? (
        <Text style={[styles.calcButtonText, getTextStyle()]}>{value}</Text>
      ) : (
        value
      )}
    </TouchableOpacity>
  );
}

export default function GlobalCalculator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    isOpen,
    isRevealed,
    displayValue,
    computedResult,
    openCalculator,
    closeCalculator,
    appendToExpression,
    clearEntry,
    clearAll,
    calculate,
    toggleSign,
  } = useCalculator();
  const { overlayCount, openOverlay, closeOverlay } = useOverlay();

  // Register calculator panel as overlay so FAB is hidden while it is open
  useEffect(() => {
    if (!isOpen) return;
    openOverlay();
    return () => closeOverlay();
  }, [isOpen, openOverlay, closeOverlay]);

  // Local state for FAB visibility (hidden edge handle vs visible FAB)
  const [isFabVisible, setIsFabVisible] = useState(false);
  const hideTimerRef = useRef(null);

  // Animation values
  const fabSlide = useSharedValue(0); // 0 = hidden, 1 = visible
  const handlePulse = useSharedValue(1);

  // Clear auto-hide timer
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Start auto-hide timer
  const startHideTimer = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isOpen) {
        setIsFabVisible(false);
        fabSlide.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
      }
    }, AUTO_HIDE_DELAY);
  }, [clearHideTimer, isOpen, fabSlide]);

  // Handle edge handle tap - reveal FAB (swift slide, no bounce)
  const handleEdgeTap = useCallback(() => {
    setIsFabVisible(true);
    fabSlide.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    startHideTimer();
  }, [fabSlide, startHideTimer]);

  // Handle FAB tap - open calculator
  const handleFabTap = useCallback(() => {
    clearHideTimer();
    openCalculator();
  }, [clearHideTimer, openCalculator]);

  // Handle calculator close - start hide timer
  const handleCloseCalculator = useCallback(() => {
    closeCalculator();
    startHideTimer();
  }, [closeCalculator, startHideTimer]);

  // Hide FAB when calculator closes
  useEffect(() => {
    if (!isOpen && isFabVisible) {
      startHideTimer();
    }
  }, [isOpen, isFabVisible, startHideTimer]);

  // Force hide FAB on swipe (clear timer, animate out)
  const forceHideFAB = useCallback(() => {
    clearHideTimer();
    setIsFabVisible(false);
    fabSlide.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
  }, [clearHideTimer, fabSlide]);

  // Swipe-left threshold (px) and velocity to force hide
  const SWIPE_THRESHOLD = 40;
  const SWIPE_VELOCITY = 350;

  // Pan gesture: swipe left to force-hide FAB (tap still opens calculator via TouchableOpacity)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-25, 25])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -SWIPE_VELOCITY) {
            runOnJS(forceHideFAB)();
          }
        }),
    [forceHideFAB]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  // Animated styles for FAB (slides in from LEFT)
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(fabSlide.value, [0, 1], [-70, 0], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(fabSlide.value, [0, 0.5, 1], [0, 0.5, 1], Extrapolation.CLAMP),
  }));

  // Animated style for edge handle (on LEFT side)
  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(fabSlide.value, [0, 1], [0, -30], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(fabSlide.value, [0, 0.3, 1], [1, 0.5, 0], Extrapolation.CLAMP),
  }));

  // Handle button press
  const handlePress = useCallback((value) => {
    if (value === 'AC') {
      clearAll();
    } else if (value === 'C') {
      clearEntry();
    } else if (value === '±') {
      toggleSign();
    } else if (value === '=') {
      calculate();
    } else {
      appendToExpression(value);
    }
  }, [appendToExpression, clearAll, clearEntry, calculate, toggleSign]);

  // Calculator buttons layout
  const buttons = useMemo(() => [
    [
      { value: 'AC', variant: 'clear' },
      { value: 'C', variant: 'function' },
      { value: '±', variant: 'function' },
      { value: '÷', variant: 'operator' },
    ],
    [
      { value: '7', variant: 'number' },
      { value: '8', variant: 'number' },
      { value: '9', variant: 'number' },
      { value: '×', variant: 'operator' },
    ],
    [
      { value: '4', variant: 'number' },
      { value: '5', variant: 'number' },
      { value: '6', variant: 'number' },
      { value: '-', variant: 'operator' },
    ],
    [
      { value: '1', variant: 'number' },
      { value: '2', variant: 'number' },
      { value: '3', variant: 'number' },
      { value: '+', variant: 'operator' },
    ],
    [
      { value: '0', variant: 'number', size: 'wide' },
      { value: '.', variant: 'number' },
      { value: '=', variant: 'equals' },
    ],
  ], []);

  // Don't render if not revealed (global setting)
  if (!isRevealed) return null;

  // Position higher to avoid collision with screen FABs (which are at bottom: 32)
  const bottomPosition = insets.bottom + 140;

  // When any overlay is open (including calculator), hide the FAB and edge handle
  const showFabAndHandle = overlayCount === 0;

  return (
    <>
      {showFabAndHandle && (
        <>
          {/* Edge Handle - visible when FAB is hidden (LEFT side) */}
          <Animated.View
            style={[
              styles.edgeHandle,
              { bottom: bottomPosition, backgroundColor: theme.colors.primary },
              handleAnimatedStyle,
            ]}
          >
            <TouchableOpacity
              style={styles.edgeHandleTouchable}
              onPress={handleEdgeTap}
              activeOpacity={0.8}
              hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
            >
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>

          {/* FAB Button - slides in from LEFT; swipe left to force-hide */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.fab,
                { bottom: bottomPosition, backgroundColor: theme.colors.primary },
                shadows.lg,
                fabAnimatedStyle,
              ]}
              pointerEvents={isFabVisible ? 'auto' : 'none'}
            >
              <TouchableOpacity
                style={styles.fabTouchable}
                onPress={handleFabTap}
                activeOpacity={0.8}
              >
                <Calculator size={22} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </>
      )}

      {/* Calculator Modal (Bottom Sheet) */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCalculator}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseCalculator}>
          <Pressable
            style={[
              styles.calculatorContainer,
              {
                backgroundColor: theme.colors.background,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
              <View style={styles.headerLeft}>
                <Calculator size={20} color={theme.colors.primary} />
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Calculator
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.surfaceSecondary }]}
                onPress={handleCloseCalculator}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Display */}
            <View style={[styles.display, { backgroundColor: theme.colors.surface }]}>
              <Text
                style={[styles.displayExpression, { color: theme.colors.text }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {displayValue}
              </Text>
              {computedResult && displayValue !== computedResult && (
                <Text style={[styles.displayResult, { color: theme.colors.primary }]}>
                  = {computedResult}
                </Text>
              )}
            </View>

            {/* Buttons Grid */}
            <View style={styles.buttonsContainer}>
              {buttons.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.buttonRow}>
                  {row.map((btn, btnIndex) => (
                    <CalcButton
                      key={`${rowIndex}-${btnIndex}`}
                      value={btn.value}
                      variant={btn.variant}
                      size={btn.size}
                      onPress={handlePress}
                      theme={theme}
                    />
                  ))}
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Edge handle - small tab peeking from LEFT edge
  edgeHandle: {
    position: 'absolute',
    left: 0,
    width: 22,
    height: 40,
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeHandleTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FAB styles - positioned on LEFT side
  fab: {
    position: 'absolute',
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    zIndex: 1000,
  },
  fabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  calculatorContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Display
  display: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 80,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  displayExpression: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'right',
  },
  displayResult: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: spacing.xs,
  },

  // Buttons
  buttonsContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  calcButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 3) / 4,
  },
  calcButtonWide: {
    flex: 2,
    maxWidth: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 3) / 4 * 2 + spacing.sm,
  },
  calcButtonText: {
    fontSize: 22,
  },
});
