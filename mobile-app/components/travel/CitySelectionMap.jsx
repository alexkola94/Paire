/**
 * CitySelectionMap – Map for selecting cities in MultiCityTripWizard.
 * Geocoding search, markers for selected cities, responsive to theme.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { geocodingService } from '../../services/api';
import { reverseGeocode } from '../../services/discoveryService';
import { ConfirmationModal, Modal } from '../index';

const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

/** Normalize lat/lng from city (supports latitude/longitude, lat/lng, or Latitude/Longitude); returns number or null */
function getLat(city) {
  const v = city?.latitude ?? city?.lat ?? city?.Latitude;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function getLng(city) {
  const v = city?.longitude ?? city?.lng ?? city?.Longitude;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{ cities: Array<{ id?: string, name: string, country?: string, latitude: number, longitude: number, orderIndex?: number }>, onCitiesChange: (cities: Array) => void, onClose?: () => void }} props
 */
export default function CitySelectionMap({ cities = [], onCitiesChange, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  /** True while reverse-geocoding after a map tap (tap-to-add) */
  const [addingFromMap, setAddingFromMap] = useState(false);
  /** City pending delete confirmation { city, index } */
  const [cityToDelete, setCityToDelete] = useState(null);
  /** City being edited { city, index } – opens edit modal */
  const [editCity, setEditCity] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const mapRegion = useMemo(() => {
    if (cities.length === 0) return DEFAULT_REGION;
    const lats = cities.map((c) => getLat(c)).filter((n) => n != null);
    const lngs = cities.map((c) => getLng(c)).filter((n) => n != null);
    if (lats.length === 0 || lngs.length === 0) return DEFAULT_REGION;
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.5;
    // Single pin: force minimum region scope so the first pin is clearly visible (not street-level zoom)
    const MIN_DELTA = 2.5;
    if (cities.length === 1) {
      return {
        latitude: lats[0],
        longitude: lngs[0],
        latitudeDelta: MIN_DELTA,
        longitudeDelta: MIN_DELTA,
      };
    }
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) + pad, MIN_DELTA),
      longitudeDelta: Math.max((maxLng - minLng) + pad, MIN_DELTA),
    };
  }, [cities]);

  /** Route line coordinates (ordered cities) for Polyline; normalize lat/lng from either property shape */
  const routeCoordinates = useMemo(() => {
    const ordered = [...cities].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return ordered
      .filter((c) => getLat(c) != null && getLng(c) != null)
      .map((c) => ({ latitude: getLat(c), longitude: getLng(c) }));
  }, [cities]);

  const doSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await geocodingService.search(q, 8);
      const list = Array.isArray(results) ? results : [];
      setSearchResults(list);
    } catch (err) {
      console.warn('Geocode search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const addCity = useCallback(
    (item) => {
      const name = item.name || item.fullName || item.Name || 'City';
      const country = item.country || item.Country || '';
      const lat = item.latitude ?? item.lat ?? item.Latitude;
      const lng = item.longitude ?? item.lng ?? item.Longitude;
      const latitude = typeof lat === 'number' && Number.isFinite(lat) ? lat : (Number(lat) || 0);
      const longitude = typeof lng === 'number' && Number.isFinite(lng) ? lng : (Number(lng) || 0);
      const newCity = {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        country: country || undefined,
        latitude,
        longitude,
        orderIndex: cities.length,
      };
      onCitiesChange([...cities, newCity]);
      setSearchQuery('');
      setSearchResults([]);
    },
    [cities, onCitiesChange]
  );

  /** Handle map press: reverse geocode then add city (tap-to-add destination) */
  const handleMapPress = useCallback(
    async (e) => {
      setSearchResults([]);
      if (addingFromMap) return;
      const { latitude, longitude } = e.nativeEvent?.coordinate || {};
      if (latitude == null || longitude == null) return;
      setAddingFromMap(true);
      try {
        const result = await reverseGeocode(latitude, longitude);
        const name = result?.name || 'Unknown place';
        const country = result?.country || '';
        const newCity = {
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name,
          country: country || undefined,
          latitude,
          longitude,
          orderIndex: cities.length,
        };
        onCitiesChange([...cities, newCity]);
      } catch (err) {
        console.warn('Map tap add failed:', err);
      } finally {
        setAddingFromMap(false);
      }
    },
    [addingFromMap, cities, onCitiesChange]
  );

  const removeCity = useCallback(
    (index) => {
      const idx = typeof index === 'number' ? index : -1;
      if (idx < 0 || idx >= cities.length) return;
      const next = cities.filter((_, i) => i !== idx).map((c, i) => ({ ...c, orderIndex: i }));
      onCitiesChange(next);
      setSelectedId(null);
      setCityToDelete(null);
    },
    [cities, onCitiesChange]
  );

  /** Request remove: show confirmation modal (chip X or marker Remove) */
  const requestRemoveCity = useCallback((index) => {
    const idx = typeof index === 'number' ? index : -1;
    if (idx < 0 || idx >= cities.length) return;
    const city = cities[idx];
    if (city) setCityToDelete({ city, index: idx });
  }, [cities]);

  /** Confirm remove: close modal first to avoid re-render crash, then remove city on next tick */
  const confirmRemoveCity = useCallback(() => {
    const payload = cityToDelete;
    setCityToDelete(null);
    if (payload == null || typeof payload.index !== 'number' || payload.index < 0 || payload.index >= cities.length) {
      return;
    }
    const indexToRemove = payload.index;
    requestAnimationFrame(() => {
      const next = cities.filter((_, i) => i !== indexToRemove).map((c, i) => ({ ...c, orderIndex: i }));
      onCitiesChange(next);
      setSelectedId(null);
    });
  }, [cityToDelete, cities, onCitiesChange]);

  /** Selected city and index for action bar (tap on marker) */
  const selectedCityIndex = useMemo(() => {
    if (selectedId == null) return -1;
    return cities.findIndex((c, i) => c.id === selectedId || i === selectedId);
  }, [cities, selectedId]);
  const selectedCity = selectedCityIndex >= 0 ? cities[selectedCityIndex] : null;

  /** Open edit modal for city at index (from action bar or chip tap) */
  const openEditForIndex = useCallback((index) => {
    const city = cities[index];
    if (!city) return;
    setEditCity({ city, index });
    setEditName(city.name || '');
    setEditCountry(city.country || '');
    setSelectedId(null);
  }, [cities]);

  /** Open edit modal for selected marker (action bar Edit) */
  const openEditModal = useCallback(() => {
    if (selectedCityIndex >= 0) openEditForIndex(selectedCityIndex);
  }, [selectedCityIndex, openEditForIndex]);

  /** Save edited city and close modal */
  const saveEditCity = useCallback(() => {
    if (editCity == null) return;
    const next = cities.map((c, i) =>
      i === editCity.index ? { ...c, name: editName.trim() || c.name, country: editCountry.trim() || c.country } : c
    );
    onCitiesChange(next);
    setEditCity(null);
    setEditName('');
    setEditCountry('');
  }, [editCity, editName, editCountry, cities, onCitiesChange]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        <Search size={20} color={theme.colors.textLight} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder={t('travel.trip.searchDestination', 'Search destination...')}
          placeholderTextColor={theme.colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={doSearch}
          style={[styles.searchBtn, { backgroundColor: theme.colors.primary }]}
          disabled={searching || searchQuery.trim().length < 3}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>{t('common.search', 'Search')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <View style={[styles.resultsList, { backgroundColor: theme.colors.surface }, shadows.lg]}>
          <FlatList
            data={searchResults}
            keyExtractor={(item, i) => `${item.latitude}-${item.longitude}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderBottomColor: theme.colors.glassBorder }]}
                onPress={() => addCity(item)}
                activeOpacity={0.7}
              >
                <MapPin size={16} color={theme.colors.primary} />
                <View style={styles.resultText}>
                  <Text style={[styles.resultName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name || item.fullName || item.Name}
                  </Text>
                  {item.country && (
                    <Text style={[styles.resultCountry, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {item.country}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsFlatList}
          />
        </View>
      )}

      {/* Map: tap to add destination (reverse geocode) */}
      <View style={styles.mapWrap}>
        <MapView
          key={`city-map-${cities.length}-${routeCoordinates.length >= 2 ? 'route' : 'single'}`}
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          region={cities.length > 0 ? mapRegion : undefined}
          showsUserLocation={false}
          onPress={handleMapPress}
        >
          {/* Route line connecting cities (straight segments; no Mapbox on mobile) */}
          {routeCoordinates.length >= 2 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={3}
              lineDashPattern={[1, 0]}
            />
          )}
          {cities.map((city, index) => {
            const lat = getLat(city);
            const lng = getLng(city);
            if (lat == null || lng == null) return null;
            return (
              <Marker
                key={city.id || `city-${index}`}
                coordinate={{ latitude: lat, longitude: lng }}
                title={city.name}
                description={city.country}
                pinColor={theme.colors.primary}
                onPress={() => setSelectedId(selectedId === (city.id || index) ? null : city.id || index)}
              />
            );
          })}
        </MapView>
        {/* Tap-to-add loading overlay */}
        {addingFromMap && (
          <View style={[styles.addingOverlay, { backgroundColor: theme.colors.background + 'E6' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.addingText, { color: theme.colors.text }]}>
              {t('travel.citySelection.addingPlace', 'Adding place…')}
            </Text>
          </View>
        )}
        {/* Hint when no cities: tap map to add */}
        {cities.length === 0 && !addingFromMap && (
          <View style={[styles.tapHint, { backgroundColor: theme.colors.surface + 'E6' }]} pointerEvents="none">
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={[styles.tapHintText, { color: theme.colors.textSecondary }]}>
              {t('travel.citySelection.tapMapToAdd', 'Tap map to add cities')}
            </Text>
          </View>
        )}
      </View>

      {/* Selected marker action bar: Edit | Remove (long-press also opens delete confirm) */}
      {selectedCity && selectedCityIndex >= 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <Text style={[styles.actionBarTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {selectedCity.name}
          </Text>
          <View style={styles.actionBarButtons}>
            <TouchableOpacity
              style={[styles.actionBarBtn, { borderColor: theme.colors.glassBorder }]}
              onPress={openEditModal}
            >
              <Text style={[styles.actionBarBtnText, { color: theme.colors.primary }]}>
                {t('common.edit', 'Edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBarBtn, { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error }]}
              onPress={() => requestRemoveCity(selectedCityIndex)}
            >
              <Text style={[styles.actionBarBtnText, { color: theme.colors.error }]}>
                {t('common.remove', 'Remove')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Edit city modal */}
      <Modal
        isOpen={editCity != null}
        onClose={() => { setEditCity(null); setEditName(''); setEditCountry(''); }}
        title={t('travel.citySelection.editDestination', 'Edit destination')}
      >
        <View style={styles.editModalContent}>
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
            {t('travel.trip.name', 'Name')}
          </Text>
          <TextInput
            style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder={t('travel.trip.name', 'Name')}
            placeholderTextColor={theme.colors.textLight}
            value={editName}
            onChangeText={setEditName}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
            {t('travel.trip.destination', 'Country')} ({t('common.optional', 'optional')})
          </Text>
          <TextInput
            style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder={t('travel.trip.searchDestination', 'Country')}
            placeholderTextColor={theme.colors.textLight}
            value={editCountry}
            onChangeText={setEditCountry}
          />
          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={[styles.actionBarBtn, { borderColor: theme.colors.glassBorder }]}
              onPress={() => { setEditCity(null); setEditName(''); setEditCountry(''); }}
            >
              <Text style={[styles.actionBarBtnText, { color: theme.colors.text }]}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBarBtn, { backgroundColor: theme.colors.primary }]}
              onPress={saveEditCity}
            >
              <Text style={[styles.actionBarBtnText, { color: '#fff' }]}>
                {t('common.save', 'Save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Remove city confirmation */}
      <ConfirmationModal
        isOpen={cityToDelete != null}
        onClose={() => setCityToDelete(null)}
        onConfirm={confirmRemoveCity}
        title={t('travel.citySelection.removeCityTitle', 'Remove city?')}
        message={t('travel.citySelection.removeCityMessage', 'Remove {{name}} from route?', { name: cityToDelete?.city?.name || '' })}
        confirmText={t('common.remove', 'Remove')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
      />

      {/* Selected city chip list */}
      {cities.length > 0 && (
        <View style={[styles.chipRow, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>
            {t('travel.home.cities', 'cities')}: {cities.length}
          </Text>
          <FlatList
            horizontal
            data={cities}
            keyExtractor={(item, i) => item.id || `city-${i}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ]}
                onPress={() => openEditForIndex(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={(e) => { e?.stopPropagation?.(); requestRemoveCity(index); }}
                  style={styles.chipRemove}
                >
                  <X size={14} color={theme.colors.text} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.chipListContent}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {onClose && (
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: theme.colors.surface }, shadows.md]}
          onPress={onClose}
        >
          <Text style={[styles.closeBtnText, { color: theme.colors.text }]}>{t('common.close', 'Close')}</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  searchBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minHeight: 44,
  },
  searchBtnText: {
    ...typography.label,
    color: '#fff',
  },
  resultsList: {
    maxHeight: 220,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  resultsFlatList: {
    maxHeight: 220,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  resultText: { flex: 1 },
  resultName: { ...typography.body, fontWeight: '600' },
  resultCountry: { ...typography.caption, marginTop: 2 },
  mapWrap: {
    flex: 1,
    minHeight: 280,
    position: 'relative',
  },
  addingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addingText: {
    ...typography.body,
  },
  tapHint: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  tapHintText: {
    ...typography.bodySmall,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    gap: spacing.sm,
  },
  actionBarTitle: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  actionBarButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBarBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionBarBtnText: {
    ...typography.label,
  },
  editModalContent: {
    padding: spacing.md,
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
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  chipLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  chipListContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  chipText: {
    ...typography.bodySmall,
    maxWidth: 120,
  },
  chipRemove: {
    padding: spacing.xs,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  closeBtnText: {
    ...typography.label,
  },
});
