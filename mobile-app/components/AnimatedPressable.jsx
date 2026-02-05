/**
 * AnimatedPressable Component
 *
 * A pressable component with scale-bounce animation on press.
 * Uses react-native-reanimated for smooth 60fps animations.
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { impactLight } from '../utils/haptics';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  scaleValue = 0.96,
  hapticOnPress = true,
  ...props
}) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!reducedMotion) {
      scale.value = withSpring(scaleValue, {
        damping: 15,
        stiffness: 400,
      });
    }
  };

  const handlePressOut = () => {
    if (!reducedMotion) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
    }
  };

  const handlePress = () => {
    if (hapticOnPress) {
      impactLight();
    }
    onPress?.();
  };

  return (
    <AnimatedPressableBase
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
}
