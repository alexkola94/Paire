/**
 * Weekly Recap – summary, top categories, insights, week navigation
 */

import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ScreenHeader } from '../../components/navigation';
import { weeklyRecapService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../constants/theme';

function formatDate(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(d);
  }
}

function formatCurrency(n) {
  return `€${(Number(n) || 0).toFixed(2)}`;
}

export default function WeeklyRecapScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [weekIndex, setWeekIndex] = useState(0);

  const { data: history, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['weekly-recap-history'],
    queryFn: async () => {
      const h = await weeklyRecapService.getHistory(8);
      if (Array.isArray(h) && h.length > 0) return h;
      const latest = await weeklyRecapService.getLatest().catch(() => null);
      return latest ? [latest] : [];
    },
  });

  const recaps = Array.isArray(history) ? history : [];
  const currentRecap = recaps[weekIndex] ?? null;

  const canGoNext = weekIndex < recaps.length - 1;
  const canGoPrev = weekIndex > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Weekly Recap" showMenuButton onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Week navigation */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => setWeekIndex((i) => Math.max(0, i - 1))}
            disabled={!canGoPrev}
            style={[
              styles.navBtn,
              { backgroundColor: theme.colors.glassBg, opacity: canGoPrev ? 1 : 0.4 },
            ]}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.weekLabel, { color: theme.colors.text }]}>
            {currentRecap
              ? `${formatDate(currentRecap.weekStart ?? currentRecap.WeekStart)} – ${formatDate(currentRecap.weekEnd ?? currentRecap.WeekEnd)}`
              : 'No recap'}
          </Text>
          <Pressable
            onPress={() => setWeekIndex((i) => Math.min(recaps.length - 1, i + 1))}
            disabled={!canGoNext}
            style={[
              styles.navBtn,
              { backgroundColor: theme.colors.glassBg, opacity: canGoNext ? 1 : 0.4 },
            ]}
          >
            <ChevronRight size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        {!currentRecap && !isLoading && (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.glassBg }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No weekly recap available yet. Recaps are generated automatically.
            </Text>
          </View>
        )}

        {currentRecap && (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total Spent
                </Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatCurrency(currentRecap.totalSpent ?? currentRecap.TotalSpent)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total Income
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {formatCurrency(currentRecap.totalIncome ?? currentRecap.TotalIncome)}
                </Text>
              </View>
            </View>

            {/* Top categories */}
            {(currentRecap.topCategories ?? currentRecap.TopCategories) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Top Categories
                </Text>
                <View style={[styles.categoriesCard, { backgroundColor: theme.colors.glassBg }]}>
                  {(() => {
                    try {
                      const raw = currentRecap.topCategories ?? currentRecap.TopCategories;
                      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                      const items = Array.isArray(parsed) ? parsed : Object.entries(parsed || {});
                      return items.slice(0, 5).map((item, i) => {
                        const [cat, amt] = Array.isArray(item) ? item : [item?.category ?? item?.name, item?.amount ?? item?.value];
                        return (
                          <View key={i} style={[styles.categoryRow, { borderBottomColor: theme.colors.glassBg }]}>
                            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                              {cat}
                            </Text>
                            <Text style={[styles.categoryAmount, { color: colors.error }]}>
                              {typeof amt === 'number' ? formatCurrency(amt) : amt}
                            </Text>
                          </View>
                        );
                      });
                    } catch {
                      return (
                        <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                          {String(currentRecap.topCategories ?? currentRecap.TopCategories) || '—'}
                        </Text>
                      );
                    }
                  })()}
                </View>
              </View>
            )}

            {/* Insights */}
            {(currentRecap.insights ?? currentRecap.Insights ?? currentRecap.formattedContent ?? currentRecap.FormattedContent) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Insights
                </Text>
                <View style={[styles.insightsCard, { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                  <Text style={[styles.insightText, { color: theme.colors.text }]}>
                    {currentRecap.insights ??
                      currentRecap.Insights ??
                      currentRecap.formattedContent ??
                      currentRecap.FormattedContent}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.tabBarBottomClearance },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  categoriesCard: {
    padding: spacing.lg,
    borderRadius: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  categoryName: { fontSize: 14 },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  insightsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  insightText: { fontSize: 14, lineHeight: 22 },
});
