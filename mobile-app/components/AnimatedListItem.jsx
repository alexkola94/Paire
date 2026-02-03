/**
 * AnimatedListItem Component
 *
 * Wrapper for list items that provides fade-in and slide-up animation
 * when the item first appears. Also supports delete animation.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  useReducedMotion,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export default function AnimatedListItem({
  children,
  index = 0,
  delay = 50,
  duration = 300,
  slideDistance = 20,
  isDeleting = false,
  onDeleteComplete,
  style,
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideDistance);
  const scale = useSharedValue(1);
  const height = useSharedValue('auto');
  const reducedMotion = useReducedMotion();

  // Entrance animation
  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const itemDelay = index * delay;
    opacity.value = withDelay(itemDelay, withTiming(1, { duration }));
    translateY.value = withDelay(
      itemDelay,
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  // Delete animation
  useEffect(() => {
    if (isDeleting && !reducedMotion) {
      // Slide out and fade
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-slideDistance, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 }, (finished) => {
        if (finished && onDeleteComplete) {
          runOnJS(onDeleteComplete)();
        }
      });
    }
  }, [isDeleting]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
