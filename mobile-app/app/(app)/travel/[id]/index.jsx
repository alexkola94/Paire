/**
 * Trip Detail Screen (React Native)
 * Summary for one trip; links to Budget, Itinerary, Packing, Documents, Travel Guide, Advisory.
 */

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  MessageCircle,
  AlertTriangle,
  MapPin,
  Wallet,
  CalendarDays,
  Package,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
    return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

function NavCard({ icon: Icon, title, subtitle, onPress, theme, styles }) {
  return (
    <TouchableOpacity
      style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={22} color={theme.colors.primary} />
      <View style={styles.linkContent}>
        <Text style={[styles.linkText, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.linkSub, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
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
        <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
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
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
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

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('travel.itinerary.date', 'Dates')}
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </Text>
        </View>

        {trip.budget != null && Number(trip.budget) > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {t('travel.budget.title', 'Budget')}
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              €{Number(trip.budget).toFixed(2)} {trip.budgetCurrency || 'EUR'}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t('travel.nav.tripSections', 'Trip sections')}
        </Text>
        <NavCard
          icon={Wallet}
          title={t('travel.budget.title', 'Budget')}
          subtitle={t('travel.budget.subtitle', 'Track trip expenses')}
          onPress={() => router.push(`/travel/${id}/budget`)}
          theme={theme}
          styles={styles}
        />
        <NavCard
          icon={CalendarDays}
          title={t('travel.itinerary.title', 'Itinerary')}
          subtitle={t('travel.itinerary.subtitle', 'Events and activities')}
          onPress={() => router.push(`/travel/${id}/itinerary`)}
          theme={theme}
          styles={styles}
        />
        <NavCard
          icon={Package}
          title={t('travel.packing.title', 'Packing')}
          subtitle={t('travel.packing.subtitle', 'Packing list')}
          onPress={() => router.push(`/travel/${id}/packing`)}
          theme={theme}
          styles={styles}
        />
        <NavCard
          icon={FileText}
          title={t('travel.documents.title', 'Documents')}
          subtitle={t('travel.documents.subtitle', 'Trip documents')}
          onPress={() => router.push(`/travel/${id}/documents`)}
          theme={theme}
          styles={styles}
        />

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t('travel.nav.guide', 'Travel Guide & Advisory')}
        </Text>
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
          onPress={() => router.replace('/travel')}
          activeOpacity={0.8}
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
          <ChevronRight size={20} color={theme.colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
          onPress={() => router.replace('/travel')}
          activeOpacity={0.8}
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
          <ChevronRight size={20} color={theme.colors.textLight} />
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
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
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
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
  },
  linkContent: { flex: 1 },
  linkText: { ...typography.body, fontWeight: '600' },
  linkSub: { ...typography.bodySmall, marginTop: 2 },
});
