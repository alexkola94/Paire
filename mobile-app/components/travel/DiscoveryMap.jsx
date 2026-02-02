/**
 * DiscoveryMap – Full-screen map with POI markers and category filters.
 * Uses discoveryService for POI search; supports save to trip and open in Maps.
 * Theme-aware and responsive.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { searchPOIs } from '../../services/discoveryService';
import POISheet from './POISheet';

const POI_CATEGORIES = [
  { id: 'restaurant', labelKey: 'travel.explore.poi.restaurant' },
  { id: 'attraction', labelKey: 'travel.explore.poi.attraction' },
  { id: 'cafe', labelKey: 'travel.explore.categories.cafes' },
  { id: 'shopping', labelKey: 'travel.explore.poi.shopping' },
  { id: 'hotel', labelKey: 'travel.explore.categories.hotels' },
];

const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/**
 * @param {{ trip: { latitude?: number, longitude?: number, destination?: string }, tripId: string, savedPlaceIds?: string[], onSavePlace?: (place: object) => void, onClose?: () => void }} props
 */
export default function DiscoveryMap({ trip, tripId, savedPlaceIds = [], onSavePlace, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [category, setCategory] = useState('restaurant');
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState(null);

  const lat = trip?.latitude ?? DEFAULT_REGION.latitude;
  const lng = trip?.longitude ?? DEFAULT_REGION.longitude;

  const initialRegion = useMemo(
    () =>
      trip?.latitude != null && trip?.longitude != null
        ? {
            latitude: trip.latitude,
            longitude: trip.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }
        : DEFAULT_REGION,
    [trip?.latitude, trip?.longitude]
  );

  const fetchPois = useCallback(async () => {
    setLoading(true);
    try {
      const results = await searchPOIs(lat, lng, category, 2, 40);
      setPois(Array.isArray(results) ? results : []);
    } catch (err) {
      console.warn('DiscoveryMap fetch POIs error:', err);
      setPois([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, category]);

  useEffect(() => {
    fetchPois();
  }, [fetchPois]);

  const handleMarkerPress = useCallback((poi) => {
    setSelectedPoi(poi);
  }, []);

  const handleSavePlace = useCallback(
    (place) => {
      onSavePlace?.(place);
      setSelectedPoi(null);
    },
    [onSavePlace]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with search and close */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        <View style={[styles.searchRow, { backgroundColor: theme.colors.background }]}>
          <Search size={20} color={theme.colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('travel.discovery.searchPlaceholder', 'Search places...')}
            placeholderTextColor={theme.colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <View style={[styles.chipRow, { backgroundColor: theme.colors.surface }]}>
        <FlatList
          horizontal
          data={POI_CATEGORIES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = category === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary + '25' : theme.colors.background,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.glassBorder,
                  },
                ]}
                onPress={() => setCategory(item.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.colors.primary : theme.colors.text },
                  ]}
                >
                  {t(item.labelKey, item.id)}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.chipList}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          region={region}
          onRegionChangeComplete={(r) => setRegion(r)}
          showsUserLocation={false}
        >
          {pois.map((poi, index) => (
            <Marker
              key={poi.id || `poi-${index}`}
              coordinate={{
                latitude: poi.latitude ?? poi.lat ?? 0,
                longitude: poi.longitude ?? poi.lng ?? 0,
              }}
              title={poi.name}
              description={poi.address}
              onPress={() => handleMarkerPress(poi)}
              pinColor={theme.colors.primary}
            />
          ))}
        </MapView>
        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.surface + 'CC' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </View>

      {/* POI detail bottom sheet */}
      {selectedPoi && (
        <POISheet
          poi={selectedPoi}
          tripId={tripId}
          centerLat={lat}
          centerLng={lng}
          isSaved={savedPlaceIds.includes(selectedPoi.id) || savedPlaceIds.includes(selectedPoi.poiId)}
          onSave={handleSavePlace}
          onClose={() => setSelectedPoi(null)}
        />
      )}
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
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 4,
    minHeight: 36,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  chipRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  chipList: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  mapWrap: {
    flex: 1,
    minHeight: 240,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
