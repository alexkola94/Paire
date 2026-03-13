/**
 * PaireScoreCard – circular progress score card for mobile dashboard
 * Color-coded: red < 40, yellow 40-69, green >= 70
 * Pressable: navigates to paire-score detail screen
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { financialHealthService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const SIZE = 64;
const STROKE = 5;

function getScoreColor(score) {
  if (score < 40) return '#EF4444';
  if (score < 70) return '#FBBF24';
  return '#10B981';
}

export default function PaireScoreCard() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['financial-health'],
    queryFn: () => financialHealthService.getScore(),
  });

  const score = scoreData?.overallScore ?? scoreData?.OverallScore ?? 0;
  const scoreColor = getScoreColor(score);

  if (isLoading) return null;

  return (
    <Pressable
      onPress={() => router.push('/(app)/paire-score')}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.glassBg,
          borderColor: theme.colors.glassBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.circle,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderColor: scoreColor,
            borderWidth: STROKE,
          },
        ]}
      >
        <Text style={[styles.scoreText, { color: theme.colors.text }]}>
          {score}
        </Text>
      </View>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Paire Score
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
