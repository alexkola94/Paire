/**
 * Trip Detail Screen (React Native)
 * Summary for one trip; links to Travel Guide and Advisory (hub).
 */

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MessageCircle, AlertTriangle, MapPin } from 'lucide-react-native';
import { travelService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
    return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

export default function TripDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('travel.common.loadingTripView', 'Loading trip...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.common.noTrip', 'No Trip')}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            {error?.message || t('common.error', 'Something went wrong.')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {trip.name || trip.destination || t('travel.nav.home', 'Trip')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <View style={styles.row}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {t('travel.layout.sections.destinationSnapshot', 'Destination')}
            </Text>
          </View>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {trip.destination || trip.name || '—'}
          </Text>
          {trip.country && (
            <Text style={[styles.valueSmall, { color: theme.colors.textSecondary }]}>{trip.country}</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('travel.itinerary.date', 'Dates')}
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </Text>
        </View>

        {trip.budget != null && Number(trip.budget) > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {t('travel.budget.title', 'Budget')}
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              €{Number(trip.budget).toFixed(2)} {trip.budgetCurrency || 'EUR'}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t('travel.nav.guide', 'Travel Guide & Advisory')}
        </Text>
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.colors.surface }, shadows.sm]}
          onPress={() => router.replace('/travel')}
        >
          <MessageCircle size={22} color={theme.colors.primary} />
          <View style={styles.linkContent}>
            <Text style={[styles.linkText, { color: theme.colors.text }]}>
              {t('travel.chatbot.title', 'Travel Guide')}
            </Text>
            <Text style={[styles.linkSub, { color: theme.colors.textSecondary }]}>
              {t('travel.chatbot.placeholder', 'Ask about your trip...')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.colors.surface }, shadows.sm]}
          onPress={() => router.replace('/travel')}
        >
          <AlertTriangle size={22} color={theme.colors.primary} />
          <View style={styles.linkContent}>
            <Text style={[styles.linkText, { color: theme.colors.text }]}>
              {t('travel.layout.sections.advisory', 'Travel Advisory')}
            </Text>
            <Text style={[styles.linkSub, { color: theme.colors.textSecondary }]}>
              {t('travel.advisory.genericMessage', 'Check official guidance before you travel.')}
            </Text>
          </View>
        </TouchableOpacity>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  loadingText: { ...typography.bodySmall, marginTop: spacing.md },
  errorText: { ...typography.body, textAlign: 'center' },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  label: { ...typography.caption, marginBottom: 2 },
  value: { ...typography.body, fontWeight: '600' },
  valueSmall: { ...typography.bodySmall, marginTop: 2 },
  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  linkContent: { flex: 1 },
  linkText: { ...typography.body, fontWeight: '600' },
  linkSub: { ...typography.bodySmall, marginTop: 2 },
});
