/**
 * Trip Travel Advisory Screen (React Native)
 * Shows travel advisory for the trip's country/destination via travelAdvisoryService.getAdvisory.
 * Back button returns to trip detail.
 */

import { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';
import { travelService, travelAdvisoryService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { useBackGesture } from '../../../../context/BackGestureContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';

export default function TripAdvisoryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const { id } = useLocalSearchParams();

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  // Use country or destination (backend may accept country name/code)
  const country = useMemo(() => {
    const c = trip?.country || trip?.destination || '';
    return typeof c === 'string' ? c.trim() : '';
  }, [trip?.country, trip?.destination]);

  const { data: advisory, isLoading: advisoryLoading, refetch, isFetching } = useQuery({
    queryKey: ['travel-advisory', country],
    queryFn: () => travelAdvisoryService.getAdvisory(country),
    enabled: !!country,
    retry: 1,
  });

  const isLoading = tripLoading || (!!country && advisoryLoading);
  const hasAdvisory = advisory && !advisory.error && (advisory.message || advisory.text || advisory.content || advisory.summary);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('common.close')}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {t('travel.layout.sections.advisory', 'Travel Advisory')}
          {country ? ` – ${country}` : ''}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !advisoryLoading}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              {t('common.loading', 'Loading...')}
            </Text>
          </View>
        ) : !country ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <AlertTriangle size={32} color={theme.colors.warning} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {t('travel.advisory.noCountry', 'No destination set')}
            </Text>
            <Text style={[styles.cardMessage, { color: theme.colors.textSecondary }]}>
              {t('travel.advisory.noCountryHint', 'Edit your trip and set a destination or country to see travel advisory.')}
            </Text>
          </View>
        ) : !hasAdvisory ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <AlertTriangle size={32} color={theme.colors.textLight} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {t('travel.advisory.unavailable', 'Advisory unavailable')}
            </Text>
            <Text style={[styles.cardMessage, { color: theme.colors.textSecondary }]}>
              {advisory?.error || t('travel.advisory.genericMessage', 'Check official guidance before you travel.')}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
            <View style={styles.cardRow}>
              <AlertTriangle size={22} color={theme.colors.primary} />
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                {country}
              </Text>
            </View>
            <Text style={[styles.advisoryBody, { color: theme.colors.text }]}>
              {advisory.message || advisory.text || advisory.content || advisory.summary || JSON.stringify(advisory)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { flex: 1, ...typography.h3 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  centered: { padding: spacing.xl, alignItems: 'center' },
  loadingText: { ...typography.bodySmall, marginTop: spacing.md },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardIcon: { alignSelf: 'center', marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardLabel: { ...typography.label },
  cardTitle: { ...typography.h3, marginBottom: spacing.sm, textAlign: 'center' },
  cardMessage: { ...typography.body, textAlign: 'center' },
  advisoryBody: { ...typography.body, lineHeight: 22 },
});
