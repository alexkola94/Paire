/**
 * Skeleton placeholder for loading content.
 * Ported from frontend Skeleton; uses View + StyleSheet (no CSS).
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borderRadius } from '../constants/theme';

export default function Skeleton({
  type = 'text',
  width,
  height,
  style = {},
}) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, useNativeDriver: true, duration: 600 }),
        Animated.timing(opacity, { toValue: 0.4, useNativeDriver: true, duration: 600 }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const baseStyle = [
    styles.base,
    {
      backgroundColor: theme.colors.surfaceSecondary,
      opacity,
    },
    type === 'text' && styles.text,
    type === 'circular' && styles.circular,
    type === 'rectangular' && styles.rectangular,
    type === 'card' && styles.card,
    width != null && { width },
    height != null && { height },
    style,
  ];

  return <Animated.View style={baseStyle} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.sm,
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
});
