import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { challengeService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const DIFFICULTY_COLORS = {
  easy: '#34D399',
  medium: '#FBBF24',
  hard: '#F87171',
};

function getChallengeEmoji(icon) {
  const map = {
    'clipboard-check': '📋', 'shield-check': '🛡️', 'ban': '🚫', 'trending-up': '📈',
    'zap': '⚡', 'tag': '🏷️', 'check-circle': '✅', 'heart': '💕',
  };
  return map[icon] || '🎯';
}

export default function ChallengeCard() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: userChallenges, isLoading } = useQuery({
    queryKey: ['user-challenges', 'active'],
    queryFn: () => challengeService.getUserChallenges('active'),
  });

  const active = Array.isArray(userChallenges) ? userChallenges.filter(uc => uc.status === 'active') : [];
  const topChallenge = active[0];

  useEffect(() => {
    if (topChallenge) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [topChallenge, fadeAnim]);

  if (isLoading || !topChallenge) return null;

  const ch = topChallenge.challenge || {};
  const progress = topChallenge.progress || 0;
  const diffColor = DIFFICULTY_COLORS[ch.difficulty] || DIFFICULTY_COLORS.medium;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/challenges')}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}44` }]}>
            <Text style={styles.emoji}>{getChallengeEmoji(ch.icon)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
              {ch.name || 'Challenge'}
            </Text>
            <Text style={[styles.desc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {ch.description || ''}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: '#FBBF24' }]}>{active.length} active</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.glassBg }]}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: diffColor }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
          {Math.round(progress)}% complete
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});
