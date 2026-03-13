/**
 * Paire Score – full detail screen
 * Large circular progress, component breakdown, historical trend, tips
 */

import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/navigation';
import { financialHealthService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../constants/theme';

const COMPONENTS = [
  { key: 'budgetAdherenceScore', label: 'Budget Adherence', weight: '25%' },
  { key: 'savingsRateScore', label: 'Savings Rate', weight: '25%' },
  { key: 'debtHealthScore', label: 'Debt Health', weight: '20%' },
  { key: 'expenseConsistencyScore', label: 'Expense Consistency', weight: '15%' },
  { key: 'goalProgressScore', label: 'Goal Progress', weight: '15%' },
];

function getScoreColor(score) {
  if (score < 40) return colors.error;
  if (score < 70) return colors.warning;
  return colors.success;
}

export default function PaireScoreScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    data: scoreData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['financial-health'],
    queryFn: () => financialHealthService.getScore(),
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['financial-health-history'],
    queryFn: () => financialHealthService.getHistory(6),
  });

  const score = scoreData?.overallScore ?? scoreData?.OverallScore ?? 0;
  const scoreColor = getScoreColor(score);
  const history = Array.isArray(historyData) ? historyData : [];

  const getVal = (obj, key) => obj?.[key] ?? obj?.[key.replace(/([A-Z])/g, (m) => m.toUpperCase())];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Paire Score" showMenuButton onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => {
              refetch();
              refetchHistory();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Large circular score */}
        <View style={styles.scoreSection}>
          <View
            style={[
              styles.circle,
              {
                borderColor: scoreColor,
                borderWidth: 8,
                backgroundColor: theme.colors.glassBg,
              },
            ]}
          >
            <Text style={[styles.scoreNumber, { color: theme.colors.text }]}>
              {isLoading ? '—' : score}
            </Text>
            <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
              Overall
            </Text>
          </View>
        </View>

        {/* Component breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Component Breakdown
          </Text>
          {COMPONENTS.map((c) => {
            const val = getVal(scoreData, c.key) ?? 0;
            const barColor = getScoreColor(val);
            return (
              <View
                key={c.key}
                style={[styles.componentRow, { backgroundColor: theme.colors.glassBg }]}
              >
                <View style={styles.componentHeader}>
                  <Text style={[styles.componentLabel, { color: theme.colors.text }]}>
                    {c.label}
                  </Text>
                  <Text style={[styles.componentValue, { color: barColor }]}>{val}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.glassBorder }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, val)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.componentWeight, { color: theme.colors.textLight }]}>
                  Weight: {c.weight}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Historical trend */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Historical Trend
          </Text>
          {history.length === 0 && !historyLoading ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No history yet. Keep tracking to see your trend.
            </Text>
          ) : (
            history.map((h, i) => {
              const s = h.overallScore ?? h.OverallScore ?? 0;
              const period = h.period ?? h.Period ?? '';
              return (
                <View
                  key={i}
                  style={[styles.historyRow, { backgroundColor: theme.colors.glassBg }]}
                >
                  <Text style={[styles.historyPeriod, { color: theme.colors.text }]}>
                    {period}
                  </Text>
                  <Text style={[styles.historyScore, { color: getScoreColor(s) }]}>{s}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Tips */}
        {(scoreData?.tips ?? scoreData?.Tips) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Tips
            </Text>
            <View style={[styles.tipsCard, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Text style={[styles.tipsText, { color: theme.colors.text }]}>
                {scoreData.tips ?? scoreData.Tips}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.tabBarBottomClearance },
  scoreSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 48, fontWeight: '700' },
  scoreLabel: { fontSize: 14, marginTop: 4 },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  componentRow: {
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  componentLabel: { fontSize: 14, fontWeight: '600' },
  componentValue: { fontSize: 14, fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  componentWeight: { fontSize: 11 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  historyPeriod: { fontSize: 14, fontWeight: '600' },
  historyScore: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 14, fontStyle: 'italic', paddingVertical: spacing.md },
  tipsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipsText: { fontSize: 14, lineHeight: 22 },
});
