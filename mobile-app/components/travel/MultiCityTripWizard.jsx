/**
 * MultiCityTripWizard – Step wizard for creating multi-city trips.
 * Step 1: Trip name and dates. Step 2: City selection (map). Step 3: Review route & transport. Step 4: Budget (optional).
 * Creates trip then cities via API; responsive to theme.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ChevronLeft, ChevronRight, MapPin, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { travelService, tripCityService } from '../../services/api';
import { calculateDistance } from '../../services/discoveryService';
import { getTransportSuggestions, TRANSPORT_MODES } from '../../utils/transportSuggestion';
import CitySelectionMap from './CitySelectionMap';
import { Modal, DateRangePicker } from '../index';

const STEPS = [
  { key: 'details', titleKey: 'travel.wizard.step1Title', descKey: 'travel.trip.step1Description' },
  { key: 'cities', titleKey: 'travel.wizard.step2Title', descKey: 'travel.home.multiCityTripSubtitle' },
  { key: 'review', titleKey: 'travel.multiCity.step2.manageRoute', descKey: 'travel.multiCity.step2.manageDescription' },
  { key: 'budget', titleKey: 'travel.wizard.step3Title', descKey: 'travel.trip.step3Description' },
];

/**
 * @param {{ trip?: object | null, onClose: () => void, onSave: (trip: object) => void }} props
 */
export default function MultiCityTripWizard({ trip = null, onClose, onSave }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { openOverlay, closeOverlay } = useOverlay();

  // Register as overlay so calculator FAB is hidden while wizard is open
  useEffect(() => {
    openOverlay();
    return () => closeOverlay();
  }, [openOverlay, closeOverlay]);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(
    trip?.startDate ? String(trip.startDate).split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    trip?.endDate ? String(trip.endDate).split('T')[0] : ''
  );
  const [cities, setCities] = useState([]);
  const [budget, setBudget] = useState(trip?.budget != null ? String(trip.budget) : '');

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  /** Home location (lat/lng) for "getting there" and "return home" legs; set when entering review step */
  const [homeLocation, setHomeLocation] = useState(null);
  /** Transport for Home → first city and Last city → Home */
  const [homeToFirstTransport, setHomeToFirstTransport] = useState(null);
  const [returnTransportMode, setReturnTransportMode] = useState(null);
  /** Transport picker: city index (number) or 'homeToFirst' | 'returnHome' */
  const [transportPickerForIndex, setTransportPickerForIndex] = useState(null);

  const canNext = useCallback(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return cities.length >= 1;
    return true;
  }, [step, name, cities]);

  /** Ordered cities for review step */
  const orderedCities = useMemo(
    () => [...cities].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [cities]
  );

  /** Distance in km: Home → first city (when home location available) */
  const homeToFirstKm = useMemo(() => {
    if (!homeLocation || orderedCities.length === 0) return null;
    const first = orderedCities[0];
    const lat = first?.latitude ?? first?.lat;
    const lon = first?.longitude ?? first?.lng;
    if (lat == null || lon == null) return null;
    return calculateDistance(homeLocation.latitude, homeLocation.longitude, lat, lon);
  }, [homeLocation, orderedCities]);

  /** Per-leg city-to-city distances (from index i to i+1) */
  const legDistances = useMemo(() => {
    const out = [];
    for (let i = 0; i < orderedCities.length - 1; i++) {
      const from = orderedCities[i];
      const to = orderedCities[i + 1];
      const lat1 = from?.latitude ?? from?.lat;
      const lon1 = from?.longitude ?? from?.lng;
      const lat2 = to?.latitude ?? to?.lat;
      const lon2 = to?.longitude ?? to?.lng;
      if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        out.push({ from, to, km: null });
      } else {
        out.push({ from, to, km: calculateDistance(lat1, lon1, lat2, lon2) });
      }
    }
    return out;
  }, [orderedCities]);

  /** Distance in km: last city → Home */
  const lastToHomeKm = useMemo(() => {
    if (!homeLocation || orderedCities.length === 0) return null;
    const last = orderedCities[orderedCities.length - 1];
    const lat = last?.latitude ?? last?.lat;
    const lon = last?.longitude ?? last?.lng;
    if (lat == null || lon == null) return null;
    return calculateDistance(lat, lon, homeLocation.latitude, homeLocation.longitude);
  }, [homeLocation, orderedCities]);

  /** Request and store home location when entering review step */
  useEffect(() => {
    if (step !== 2 || orderedCities.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setHomeLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (err) {
        if (!cancelled) console.warn('Home location error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [step, orderedCities.length]);

  /** Set default transportMode for each city (except first) when entering review step */
  useEffect(() => {
    if (step !== 2 || orderedCities.length < 2) return;
    setCities((prev) => {
      let changed = false;
      const next = prev.map((city) => {
        const idx = orderedCities.findIndex((o) => (o.id && o.id === city.id) || (o === city));
        if (idx <= 0 || city.transportMode != null) return city;
        const prevCity = orderedCities[idx - 1];
        const lat1 = prevCity?.latitude ?? prevCity?.lat;
        const lon1 = prevCity?.longitude ?? prevCity?.lng;
        const lat2 = city?.latitude ?? city?.lat;
        const lon2 = city?.longitude ?? city?.lng;
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return city;
        const dist = calculateDistance(lat1, lon1, lat2, lon2);
        const suggestions = getTransportSuggestions({
          distanceKm: dist,
          fromCity: prevCity,
          toCity: city,
        });
        changed = true;
        return { ...city, transportMode: suggestions[0] || 'car' };
      });
      return changed ? next : prev;
    });
  }, [step, orderedCities.length]);

  /** Default transport for Home→first and Last→home when home location and distances are available */
  useEffect(() => {
    if (step !== 2 || !homeLocation || orderedCities.length === 0) return;
    setHomeToFirstTransport((prev) => {
      if (prev != null) return prev;
      if (homeToFirstKm == null) return prev;
      const first = orderedCities[0];
      const suggestions = getTransportSuggestions({
        distanceKm: homeToFirstKm,
        fromCity: { name: 'Home' },
        toCity: first,
      });
      return suggestions[0] || 'car';
    });
    setReturnTransportMode((prev) => {
      if (prev != null) return prev;
      if (lastToHomeKm == null) return prev;
      const last = orderedCities[orderedCities.length - 1];
      const suggestions = getTransportSuggestions({
        distanceKm: lastToHomeKm,
        fromCity: last,
        toCity: { name: 'Home' },
      });
      return suggestions[0] || 'car';
    });
  }, [step, homeLocation, orderedCities, homeToFirstKm, lastToHomeKm]);

  /** Update transport mode for city at ordered index (incoming leg), or home legs when key is 'homeToFirst' | 'returnHome' */
  const setTransportMode = useCallback((keyOrIndex, mode) => {
    if (keyOrIndex === 'homeToFirst') {
      setHomeToFirstTransport(mode);
    } else if (keyOrIndex === 'returnHome') {
      setReturnTransportMode(mode);
    } else {
      const target = orderedCities[keyOrIndex];
      if (target) {
        setCities((prev) =>
          prev.map((c) =>
            (c.id && c.id === target.id) || c === target ? { ...c, transportMode: mode } : c
          )
        );
      }
    }
    setTransportPickerForIndex(null);
  }, [orderedCities]);

  const handleNext = useCallback(() => {
    setError(null);
    if (isLast) {
      handleSave();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [isLast]);

  const handleBack = useCallback(() => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        destination: cities.length > 0 ? cities[0].name : name.trim(),
        startDate: startDate ? `${startDate}T00:00:00.000Z` : null,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : null,
        budget: budget.trim() ? parseFloat(budget) : 0,
        budgetCurrency: 'EUR',
        tripType: 'multi-city',
      };
      const created = await travelService.createTrip(payload);
      const tripId = created?.id;
      if (!tripId) throw new Error('Trip created but no ID returned');

      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        await tripCityService.create(tripId, {
          name: city.name,
          country: city.country || null,
          latitude: city.latitude ?? null,
          longitude: city.longitude ?? null,
          orderIndex: i,
          transportMode: city.transportMode || null,
          startDate: city.startDate || null,
          endDate: city.endDate || null,
        });
      }

      const fullTrip = await travelService.getTrip(tripId);
      onSave(fullTrip || created);
      onClose();
    } catch (err) {
      setError(err?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  }, [name, startDate, endDate, budget, cities, onSave, onClose, t]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity
          onPress={isFirst ? onClose : handleBack}
          style={styles.headerBtn}
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            {t(currentStep.titleKey, currentStep.key)}
          </Text>
          <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t(currentStep.descKey, '')}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress */}
      <View style={[styles.progressRow, { backgroundColor: theme.colors.surface }]}>
        {STEPS.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.glassBorder,
              },
            ]}
          />
        ))}
      </View>

      {/* Step content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {step === 0 && (
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
              {t('travel.trip.name', 'Name')}
            </Text>
            <TextInput
              style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder={t('travel.itinerary.eventNamePlaceholder', 'e.g. Paris 2025')}
              placeholderTextColor={theme.colors.textLight}
              value={name}
              onChangeText={setName}
            />
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
              {t('travel.trip.startDate', 'Start Date')} / {t('travel.trip.endDate', 'End Date')}
            </Text>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              label={t('travel.datePicker.selectDates', 'Select dates')}
              maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
              showQuickPresets={true}
            />
          </ScrollView>
        )}

        {step === 1 && (
          <View style={styles.mapStep}>
            <CitySelectionMap
              cities={cities}
              onCitiesChange={setCities}
            />
          </View>
        )}

        {step === 2 && (
          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={[styles.reviewHint, { color: theme.colors.textSecondary }]}>
              {t('travel.multiCity.step2.manageDescription', 'Arrange your stops and choose transport.')}
            </Text>
            {/* Getting there: Home → first city (when home location available) */}
            {homeLocation && orderedCities.length > 0 && (
              <View style={[styles.legRow, { borderColor: theme.colors.glassBorder }]}>
                <View style={styles.legLabel}>
                  <Text style={[styles.legFromTo, { color: theme.colors.textSecondary }]}>
                    {t('travel.multiCity.gettingThere', 'Getting there')}
                  </Text>
                  <Text style={[styles.legRoute, { color: theme.colors.text }]}>
                    {t('travel.multiCity.home', 'Home')} → {orderedCities[0].name}
                  </Text>
                  {homeToFirstKm != null && (
                    <Text style={[styles.legKm, { color: theme.colors.textSecondary }]}>
                      {Math.round(homeToFirstKm)} km
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.transportChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
                  onPress={() => setTransportPickerForIndex('homeToFirst')}
                >
                  <Text style={[styles.transportChipText, { color: theme.colors.primary }]} numberOfLines={1}>
                    {t('transport.mode.' + (homeToFirstTransport || 'car'), homeToFirstTransport || 'car')}
                  </Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            {/* City list with leg rows (From → To, km, transport) between cities */}
            {orderedCities.map((city, index) => (
              <React.Fragment key={city.id || `city-${index}`}>
                {/* Leg from previous city to this one (with distance + transport) */}
                {index > 0 && (() => {
                  const leg = legDistances[index - 1];
                  return (
                    <View style={[styles.legRow, { borderColor: theme.colors.glassBorder }]}>
                      <View style={styles.legLabel}>
                        <Text style={[styles.legRoute, { color: theme.colors.text }]}>
                          {(leg?.from?.name) || ''} → {(leg?.to?.name) || city.name}
                        </Text>
                        {leg?.km != null && (
                          <Text style={[styles.legKm, { color: theme.colors.textSecondary }]}>
                            {Math.round(leg.km)} km
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.transportChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
                        onPress={() => setTransportPickerForIndex(index)}
                      >
                        <Text style={[styles.transportChipText, { color: theme.colors.primary }]} numberOfLines={1}>
                          {t('transport.mode.' + (city.transportMode || 'car'), city.transportMode || 'car')}
                        </Text>
                        <ChevronDown size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  );
                })()}
                <View style={[styles.reviewRow, { borderColor: theme.colors.glassBorder }]}>
                  <View style={[styles.reviewNumber, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.reviewNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.reviewCityInfo}>
                    <Text style={[styles.reviewCityName, { color: theme.colors.text }]} numberOfLines={1}>
                      {city.name}
                    </Text>
                    {city.country ? (
                      <Text style={[styles.reviewCountry, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {city.country}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </React.Fragment>
            ))}
            {/* Return home: last city → Home (when home location available) */}
            {homeLocation && orderedCities.length > 0 && (
              <View style={[styles.legRow, { borderColor: theme.colors.glassBorder }]}>
                <View style={styles.legLabel}>
                  <Text style={[styles.legFromTo, { color: theme.colors.textSecondary }]}>
                    {t('travel.multiCity.returnHome', 'Return home')}
                  </Text>
                  <Text style={[styles.legRoute, { color: theme.colors.text }]}>
                    {orderedCities[orderedCities.length - 1].name} → {t('travel.multiCity.home', 'Home')}
                  </Text>
                  {lastToHomeKm != null && (
                    <Text style={[styles.legKm, { color: theme.colors.textSecondary }]}>
                      {Math.round(lastToHomeKm)} km
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.transportChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
                  onPress={() => setTransportPickerForIndex('returnHome')}
                >
                  <Text style={[styles.transportChipText, { color: theme.colors.primary }]} numberOfLines={1}>
                    {t('transport.mode.' + (returnTransportMode || 'car'), returnTransportMode || 'car')}
                  </Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {step === 3 && (
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
              {t('travel.budget.amount', 'Budget')} ({t('common.optional', 'optional')})
            </Text>
            <TextInput
              style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder={t('travel.trip.budgetPlaceholder', '0')}
              placeholderTextColor={theme.colors.textLight}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </ScrollView>
        )}

        {/* Transport mode picker modal */}
        <Modal
          isOpen={transportPickerForIndex != null}
          onClose={() => setTransportPickerForIndex(null)}
          title={t('travel.multiCity.step1.transportLabel', 'Transport')}
        >
          <View style={styles.transportPickerList}>
            {TRANSPORT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.transportOption, { borderColor: theme.colors.glassBorder }]}
                onPress={() => setTransportMode(transportPickerForIndex, mode)}
                activeOpacity={0.7}
              >
                <Text style={[styles.transportOptionText, { color: theme.colors.text }]}>
                  {t('transport.mode.' + mode, mode)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Footer: Back/Cancel + Next/Create (match frontend) */}
        <View style={[styles.footer, { borderTopColor: theme.colors.glassBorder }]}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.colors.glassBorder }]}
            onPress={isFirst ? onClose : handleBack}
            disabled={saving}
            accessibilityLabel={isFirst ? t('common.cancel') : t('common.back')}
          >
            <ChevronLeft size={18} color={theme.colors.text} />
            <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>
              {isFirst ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, shadows.sm]}
            onPress={handleNext}
            disabled={!canNext() || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>
                  {isLast ? t('travel.common.createTrip', 'Create Trip') : t('common.next', 'Next')}
                </Text>
                {!isLast && <ChevronRight size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepTitle: {
    ...typography.h3,
  },
  stepDesc: {
    ...typography.caption,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  formScroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  formLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    minHeight: 44,
  },
  mapStep: {
    flex: 1,
    minHeight: 320,
  },
  reviewHint: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
  },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  legLabel: {
    flex: 1,
  },
  legFromTo: {
    ...typography.caption,
    marginBottom: 2,
  },
  legRoute: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  legKm: {
    ...typography.caption,
    marginTop: 2,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  reviewNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewNumberText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#fff',
  },
  reviewCityInfo: { flex: 1 },
  reviewCityName: { ...typography.body, fontWeight: '600' },
  reviewCountry: { ...typography.caption, marginTop: 2 },
  transportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 120,
  },
  transportChipText: {
    ...typography.caption,
    fontWeight: '500',
  },
  transportPickerList: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  transportOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  transportOptionText: {
    ...typography.body,
  },
  errorBox: {
    marginHorizontal: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 48,
  },
  secondaryBtnText: {
    ...typography.label,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 48,
    gap: spacing.xs,
  },
  primaryBtnText: {
    ...typography.label,
    color: '#fff',
  },
});
