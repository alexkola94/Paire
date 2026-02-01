/**
 * Animation Utilities for Mobile App
 * 
 * Provides reusable animation presets and utilities using react-native-reanimated.
 * Includes support for reduced motion accessibility setting.
 */

import { useReducedMotion, withTiming, withSpring, withDelay, Easing } from 'react-native-reanimated';

// Default timing configuration
export const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

// Spring configuration presets
export const SPRING_CONFIG = {
  gentle: { damping: 15, stiffness: 100 },
  bouncy: { damping: 10, stiffness: 150 },
  stiff: { damping: 20, stiffness: 200 },
  default: { damping: 12, stiffness: 120 },
};

/**
 * Hook to check if reduced motion is enabled
 * Returns animation values respecting the setting
 */
export function useAnimationConfig() {
  const reducedMotion = useReducedMotion();
  
  return {
    reducedMotion,
    // Duration becomes instant if reduced motion is enabled
    duration: reducedMotion ? 0 : TIMING_CONFIG.duration,
    // Spring becomes timing with no animation if reduced motion
    springConfig: reducedMotion ? { duration: 0 } : SPRING_CONFIG.default,
  };
}

/**
 * Creates a fade-in animation value
 * @param {number} delay - Animation delay in ms
 * @param {number} duration - Animation duration in ms
 */
export function fadeIn(delay = 0, duration = 300) {
  return {
    from: { opacity: 0 },
    to: { opacity: 1 },
    delay,
    duration,
  };
}

/**
 * Creates a fade-out animation value
 * @param {number} delay - Animation delay in ms
 * @param {number} duration - Animation duration in ms
 */
export function fadeOut(delay = 0, duration = 200) {
  return {
    from: { opacity: 1 },
    to: { opacity: 0 },
    delay,
    duration,
  };
}

/**
 * Creates a slide-in animation configuration
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {number} distance - Distance to slide in pixels
 */
export function slideIn(direction = 'up', distance = 50) {
  const transforms = {
    up: { translateY: distance },
    down: { translateY: -distance },
    left: { translateX: distance },
    right: { translateX: -distance },
  };
  
  return {
    from: { ...transforms[direction], opacity: 0 },
    to: { translateX: 0, translateY: 0, opacity: 1 },
  };
}

/**
 * Creates a slide-out animation configuration
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {number} distance - Distance to slide in pixels
 */
export function slideOut(direction = 'down', distance = 50) {
  const transforms = {
    up: { translateY: -distance },
    down: { translateY: distance },
    left: { translateX: -distance },
    right: { translateX: distance },
  };
  
  return {
    from: { translateX: 0, translateY: 0, opacity: 1 },
    to: { ...transforms[direction], opacity: 0 },
  };
}

/**
 * Scale animation for press feedback
 * @param {number} pressedScale - Scale when pressed (default 0.95)
 */
export function scalePress(pressedScale = 0.95) {
  return {
    pressed: { scale: pressedScale },
    released: { scale: 1 },
  };
}

/**
 * Creates staggered delay for list items
 * @param {number} index - Item index in the list
 * @param {number} baseDelay - Base delay between items in ms
 * @param {number} maxDelay - Maximum total delay in ms
 */
export function getStaggerDelay(index, baseDelay = 50, maxDelay = 500) {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Entrance animation for list items with stagger
 * @param {number} index - Item index
 * @param {number} baseDelay - Base delay between items
 */
export function listItemEntrance(index, baseDelay = 50) {
  const delay = getStaggerDelay(index, baseDelay);
  return {
    from: { opacity: 0, translateY: 20 },
    to: { opacity: 1, translateY: 0 },
    delay,
    duration: 300,
  };
}

/**
 * Shimmer animation values for skeleton loading
 */
export const SHIMMER_CONFIG = {
  duration: 1200,
  inputRange: [0, 0.5, 1],
  outputRange: [-1, 0, 1],
};

/**
 * Success checkmark animation configuration
 */
export const SUCCESS_ANIMATION = {
  circle: {
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 300,
  },
  checkmark: {
    from: { pathLength: 0 },
    to: { pathLength: 1 },
    delay: 200,
    duration: 400,
  },
};

/**
 * Modal animation configurations
 */
export const MODAL_ANIMATIONS = {
  overlay: {
    enter: { opacity: 0.5 },
    exit: { opacity: 0 },
    duration: 250,
  },
  content: {
    enter: { translateY: 0, opacity: 1 },
    exit: { translateY: 100, opacity: 0 },
    duration: 300,
  },
};

/**
 * Button press animation scale values
 */
export const BUTTON_SCALE = {
  pressed: 0.96,
  released: 1,
  duration: 100,
};

/**
 * Card entrance animation
 */
export const CARD_ENTRANCE = {
  from: { opacity: 0, scale: 0.95, translateY: 10 },
  to: { opacity: 1, scale: 1, translateY: 0 },
  duration: 350,
  springConfig: SPRING_CONFIG.gentle,
};

export default {
  TIMING_CONFIG,
  SPRING_CONFIG,
  SHIMMER_CONFIG,
  SUCCESS_ANIMATION,
  MODAL_ANIMATIONS,
  BUTTON_SCALE,
  CARD_ENTRANCE,
  useAnimationConfig,
  fadeIn,
  fadeOut,
  slideIn,
  slideOut,
  scalePress,
  getStaggerDelay,
  listItemEntrance,
};
