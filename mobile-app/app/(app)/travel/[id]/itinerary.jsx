/**
 * Trip Itinerary Screen (React Native)
 * List itinerary events by date; add/edit/delete.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Pencil, Trash2, CalendarDays, MapPin } from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { useBackGesture } from '../../../../context/BackGestureContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, useToast, ConfirmationModal } from '../../../../components';

const EVENT_TYPES = ['flight', 'hotel', 'activity', 'restaurant', 'transit', 'other'];

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
    return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

export default function TripItineraryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formType, setFormType] = useState('activity');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  const { data: events = [], refetch, isFetching } = useQuery({
    queryKey: ['travel-events', id],
    queryFn: () => travelService.getEvents(id),
    enabled: !!id,
  });

  const sections = useMemo(() => {
    const byDate = {};
    (events || []).forEach((e) => {
      const key = (e.date || '').toString().split('T')[0] || '—';
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(e);
    });
    const keys = Object.keys(byDate).sort((a, b) => (a > b ? 1 : -1));
    return keys.map((key) => ({ title: formatDate(key), data: byDate[key] }));
  }, [events]);

  const createMutation = useMutation({
    mutationFn: (payload) => travelService.createEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-events', id] });
      showToast(t('travel.itinerary.eventAdded', 'Event added'), 'success');
      setAddModalOpen(false);
      resetForm();
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, ...payload }) => travelService.updateEvent(id, eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-events', id] });
      showToast(t('travel.itinerary.eventUpdated', 'Event updated'), 'success');
      setEditingEvent(null);
      resetForm();
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId) => travelService.deleteEvent(id, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-events', id] });
      showToast(t('travel.itinerary.eventDeleted', 'Event deleted'), 'success');
      setDeleteTarget(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const resetForm = () => {
    setFormType('activity');
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('');
    setFormLocation('');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openEdit = (item) => {
    setEditingEvent(item);
    setFormType(item.type || 'activity');
    setFormTitle(item.title || '');
    setFormDate((item.date || '').toString().split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormTime(item.time || '');
    setFormLocation(item.location || '');
  };

  const handleSubmit = () => {
    const title = formTitle.trim();
    if (!title) {
      showToast(t('validation.required', { field: t('travel.itinerary.titleLabel', 'Title') }), 'error');
      return;
    }
    const payload = {
      type: formType,
      title,
      date: formDate,
      time: formTime || null,
      location: formLocation || null,
    };
    if (editingEvent) {
      updateMutation.mutate({ eventId: editingEvent.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={() => openEdit(item)}
      onLongPress={() => setDeleteTarget(item)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <CalendarDays size={20} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.title || '—'}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
            {t(`travel.itinerary.types.${item.type}`, item.type)}
            {item.time ? ` • ${item.time}` : ''}
          </Text>
          {item.location ? (
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              <MapPin size={12} /> {item.location}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
    </View>
  );

  if (tripLoading || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.itinerary.title', 'Itinerary')}</Text>
        <TouchableOpacity
          onPress={() => { setEditingEvent(null); resetForm(); setAddModalOpen(true); }}
          style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          accessibilityLabel={t('travel.itinerary.addEvent', 'Add event')}
          accessibilityRole="button"
        >
          <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>
            {t('travel.itinerary.noEvents', 'No events yet. Tap + to add.')}
          </Text>
        }
      />

      <Modal
        isOpen={addModalOpen || !!editingEvent}
        onClose={() => { setAddModalOpen(false); setEditingEvent(null); resetForm(); }}
        title={editingEvent ? t('travel.itinerary.editEvent', 'Edit event') : t('travel.itinerary.addEvent', 'Add event')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.itinerary.type', 'Type')}</Text>
            <View style={styles.chipWrap}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface },
                    formType === type && { backgroundColor: theme.colors.primary + '30', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setFormType(type)}
                >
                  <Text style={[styles.chipText, { color: formType === type ? theme.colors.primary : theme.colors.text }]}>
                    {t(`travel.itinerary.types.${type}`, type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.itinerary.titleLabel', 'Title')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.itinerary.title', 'Title'), formTitle);
                if (v != null) setFormTitle(v);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formTitle || '—'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('transaction.date', 'Date')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const d = prompt(t('transaction.date', 'Date (YYYY-MM-DD)'), formDate);
                if (d != null) setFormDate(d);
              }}
            >
              <Text style={{ color: theme.colors.text }}>{formDate}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.itinerary.time', 'Time')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.itinerary.time', 'Time'), formTime);
                if (v != null) setFormTime(v);
              }}
            >
              <Text style={{ color: theme.colors.text }}>{formTime || '—'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.itinerary.location', 'Location')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.itinerary.location', 'Location'), formLocation);
                if (v != null) setFormLocation(v);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formLocation || '—'}</Text>
            </TouchableOpacity>
          </View>
          <Button
            title={editingEvent ? t('common.save') : t('travel.itinerary.addEvent', 'Add event')}
            onPress={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('travel.itinerary.deleteEvent', 'Delete event?')}
        message={t('travel.itinerary.deleteConfirm', 'This cannot be undone.')}
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
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  sectionHeader: { paddingVertical: spacing.sm, paddingHorizontal: 0, marginTop: spacing.md },
  sectionTitle: { ...typography.label },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardSub: { ...typography.bodySmall, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  formRow: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputTouch: { padding: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  chipText: { ...typography.caption },
});
