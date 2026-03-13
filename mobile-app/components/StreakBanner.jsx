/**
 * StreakBanner – compact streak display for mobile dashboard
 * Shows flame emoji + current streak count + "Day Streak!"
 * Fetches data from streakService, uses Animated API for subtle pulse
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { streakService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function StreakBanner() {
  const { theme, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: streaks, isLoading } = useQuery({
    queryKey: ['streaks'],
    queryFn: () => streakService.getAll(),
  });

  // Use expense_logging or login streak (whichever has highest current streak)
  const activeStreak = Array.isArray(streaks)
    ? streaks
        .filter((s) => (s.currentStreak ?? s.CurrentStreak ?? 0) > 0)
        .sort((a, b) => (b.currentStreak ?? b.CurrentStreak ?? 0) - (a.currentStreak ?? a.CurrentStreak ?? 0))[0]
    : null;

  const currentStreak = activeStreak
    ? activeStreak.currentStreak ?? activeStreak.CurrentStreak ?? 0
    : 0;

  useEffect(() => {
    if (currentStreak > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [currentStreak, pulseAnim]);

  if (isLoading || currentStreak === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: currentStreak > 0 ? 'rgba(239, 68, 68, 0.2)' : theme.colors.glassBg,
          borderColor: currentStreak > 0 ? 'rgba(239, 68, 68, 0.4)' : theme.colors.glassBorder,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Text style={styles.emoji}>🔥</Text>
      <Text style={[styles.count, { color: theme.colors.text }]}>
        {currentStreak}
      </Text>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Day Streak!
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
