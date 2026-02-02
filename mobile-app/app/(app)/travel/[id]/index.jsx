/**
 * Trip Detail Screen (React Native)
 * Summary for one trip; links to Budget, Itinerary, Packing, Documents, Travel Guide, Advisory.
 * Header actions: Edit trip (modal), Delete trip (confirmation).
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { travelService, tripCityService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, ConfirmationModal, useToast } from '../../../../components';
import { TripMicrography } from '../../../../components/travel';

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
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams();

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  // Trip cities for multi-city route (TripMicrography)
  const { data: tripCities = [] } = useQuery({
    queryKey: ['travel-trip-cities', id],
    queryFn: () => tripCityService.getByTrip(id),
    enabled: !!id,
  });

  // Trip status: upcoming | inProgress | past (for status badge)
  const tripStatus = (() => {
    if (!trip?.startDate && !trip?.endDate) return null;
    const now = new Date();
    const start = trip.startDate ? new Date(trip.startDate) : null;
    const end = trip.endDate ? new Date(trip.endDate) : null;
    if (end && now > end) return 'past';
    if (start && now < start) return 'upcoming';
    return 'inProgress';
  })();

  const updateMutation = useMutation({
    mutationFn: (payload) => travelService.updateTrip(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-trip', id] });
      queryClient.invalidateQueries({ queryKey: ['travel-trips'] });
      showToast(t('travel.tripUpdated', 'Trip updated'), 'success');
      setEditModalOpen(false);
      setMenuVisible(false);
    },
    onError: (err) => {
      showToast(err?.message || t('common.error'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => travelService.deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-trips'] });
      setDeleteConfirmOpen(false);
      setMenuVisible(false);
      showToast(t('travel.trip.deleteTrip', 'Trip deleted'), 'success');
      router.replace('/travel');
    },
    onError: (err) => {
      showToast(err?.message || t('common.error'), 'error');
    },
  });

  const openEditModal = () => {
    if (!trip) return;
    setEditName(trip.name || '');
    setEditDestination(trip.destination || '');
    setEditStartDate((trip.startDate || '').toString().split('T')[0] || '');
    setEditEndDate((trip.endDate || '').toString().split('T')[0] || '');
    setEditBudget(trip.budget != null ? String(trip.budget) : '');
    setEditModalOpen(true);
    setMenuVisible(false);
  };

  const handleSaveEdit = () => {
    const payload = {
      name: editName.trim() || undefined,
      destination: editDestination.trim() || undefined,
      startDate: editStartDate ? `${editStartDate}T00:00:00.000Z` : undefined,
      endDate: editEndDate ? `${editEndDate}T23:59:59.999Z` : undefined,
      budget: editBudget.trim() ? parseFloat(editBudget) : undefined,
    };
    updateMutation.mutate(payload);
  };

  const handleDeletePress = () => {
    setDeleteConfirmOpen(true);
    setMenuVisible(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('common.close')}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {trip.name || trip.destination || t('travel.nav.home', 'Trip')}
        </Text>
        <TouchableOpacity
          onPress={() => setMenuVisible((v) => !v)}
          style={styles.menuBtn}
          accessibilityLabel={t('travel.trip.editTrip', 'Edit Trip')}
        >
          <MoreVertical size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Overflow menu: Edit / Delete */}
      {menuVisible && (
        <View style={[styles.menuOverlay, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.glassBorder }]}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Pencil size={20} color={theme.colors.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{t('travel.trip.editTrip', 'Edit Trip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={theme.colors.error} />
            <Text style={[styles.menuItemText, { color: theme.colors.error }]}>{t('travel.trip.deleteTrip', 'Delete Trip')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={() => menuVisible && setMenuVisible(false)}
        scrollEventThrottle={16}
      >
        {/* Trip status badge (upcoming / in progress / past) */}
        {tripStatus && (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    tripStatus === 'upcoming'
                      ? theme.colors.primary
                      : tripStatus === 'inProgress'
                        ? '#22C55E'
                        : theme.colors.textLight,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: theme.colors.text }]}>
              {t('travel.status.' + tripStatus, tripStatus === 'upcoming' ? 'Upcoming' : tripStatus === 'inProgress' ? 'In progress' : 'Past')}
            </Text>
          </View>
        )}

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

        {/* Multi-city route summary (map + city timeline + distance) */}
        {tripCities.length > 0 && (
          <View style={styles.micrographySection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('travel.layout.sections.routeSummary', 'Route Summary')}
            </Text>
            <TripMicrography
              trip={trip}
              cities={tripCities.map((c) => ({
                ...c,
                latitude: c.latitude ?? c.Latitude,
                longitude: c.longitude ?? c.Longitude,
                name: c.name ?? c.cityName,
                orderIndex: c.orderIndex ?? c.order_index,
              }))}
              onNavigate={(page) => router.push(`/travel/${id}/${page}`)}
            />
          </View>
        )}

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
        <NavCard
          icon={MapPin}
          title={t('travel.explore.title', 'Explore')}
          subtitle={t('travel.explore.subtitle', 'Map and nearby places')}
          onPress={() => router.push(`/travel/${id}/explore`)}
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
          onPress={() => router.push(`/travel/${id}/advisory`)}
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

      {/* Edit Trip Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={t('travel.trip.editTrip', 'Edit Trip')}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.tripName', 'Trip Name')}</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder, color: theme.colors.text }]}
            value={editName}
            onChangeText={setEditName}
            placeholder={t('travel.trip.tripName', 'Trip name')}
            placeholderTextColor={theme.colors.textLight}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.destination', 'Destination')}</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder, color: theme.colors.text }]}
            value={editDestination}
            onChangeText={setEditDestination}
            placeholder={t('travel.trip.searchDestination', 'Destination')}
            placeholderTextColor={theme.colors.textLight}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.startDate', 'Start Date')}</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder, color: theme.colors.text }]}
            value={editStartDate}
            onChangeText={setEditStartDate}
            placeholder={t('travel.trip.startDatePlaceholder', 'YYYY-MM-DD')}
            placeholderTextColor={theme.colors.textLight}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.endDate', 'End Date')}</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder, color: theme.colors.text }]}
            value={editEndDate}
            onChangeText={setEditEndDate}
            placeholder={t('travel.trip.endDatePlaceholder', 'YYYY-MM-DD')}
            placeholderTextColor={theme.colors.textLight}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.budget', 'Budget')}</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder, color: theme.colors.text }]}
            value={editBudget}
            onChangeText={setEditBudget}
            placeholder={t('travel.trip.budgetPlaceholder', '0')}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.textLight}
          />
          <View style={styles.modalActions}>
            <Button variant="secondary" onPress={() => setEditModalOpen(false)} title={t('common.cancel')} />
            <Button onPress={handleSaveEdit} title={t('common.save')} loading={updateMutation.isPending} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Trip Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t('travel.home.deleteTripTitle', 'Delete this trip?')}
        message={t('travel.home.deleteTripMessage', 'This will permanently delete this trip and all related data.')}
        confirmText={t('travel.trip.deleteTrip', 'Delete Trip')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
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
  scroll: { padding: spacing.md, paddingBottom: spacing.lg },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: { ...typography.caption, fontWeight: '600' },
  micrographySection: { marginBottom: spacing.md },
  menuBtn: { padding: spacing.xs },
  menuOverlay: {
    position: 'absolute',
    top: 56,
    right: spacing.sm,
    minWidth: 160,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 10,
    ...shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  menuItemText: { ...typography.body },
  formLabel: { ...typography.label, marginBottom: 4, marginTop: spacing.sm },
  formInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    minHeight: 44,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
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
