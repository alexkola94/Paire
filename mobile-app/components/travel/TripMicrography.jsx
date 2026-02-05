/**
 * TripMicrography – Route visualization for multi-city trips.
 * Shows small map with city markers and city timeline (order, names, dates).
 * Theme-aware; uses react-native-maps.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { calculateDistance } from '../../services/discoveryService';

function formatDate(d) {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
    return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
  } catch {
    return '—';
  }
}

/**
 * @param {{ trip: object, cities: Array<{ id?: string, name: string, country?: string, latitude?: number, longitude?: number, startDate?: string, endDate?: string, orderIndex?: number }>, onNavigate?: (page: string) => void }} props
 */
export default function TripMicrography({ trip, cities = [], onNavigate }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const orderedCities = useMemo(() => {
    const list = Array.isArray(cities) ? cities : [];
    return [...list].sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0));
  }, [cities]);

  const mapRegion = useMemo(() => {
    if (orderedCities.length === 0) return null;
    const withCoords = orderedCities.filter((c) => c.latitude != null && c.longitude != null);
    if (withCoords.length === 0) return null;
    const lats = withCoords.map((c) => c.latitude);
    const lngs = withCoords.map((c) => c.longitude);
    const pad = 0.2;
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(Math.max(...lats) - Math.min(...lats) + pad, 0.5),
      longitudeDelta: Math.max(Math.max(...lngs) - Math.min(...lngs) + pad, 0.5),
    };
  }, [orderedCities]);

  const totalDistance = useMemo(() => {
    let km = 0;
    for (let i = 0; i < orderedCities.length - 1; i++) {
      const a = orderedCities[i];
      const b = orderedCities[i + 1];
      if (a?.latitude != null && a?.longitude != null && b?.latitude != null && b?.longitude != null) {
        km += calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
      }
    }
    return km;
  }, [orderedCities]);

  const openGoogleMapsDirections = () => {
    const withCoords = orderedCities.filter((c) => c.latitude != null && c.longitude != null);
    if (withCoords.length < 2) return;
    const origin = `${withCoords[0].latitude},${withCoords[0].longitude}`;
    const dest = `${withCoords[withCoords.length - 1].latitude},${withCoords[withCoords.length - 1].longitude}`;
    const waypoints =
      withCoords.length > 2
        ? withCoords
            .slice(1, -1)
            .map((c) => `${c.latitude},${c.longitude}`)
            .join('|')
        : '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  if (orderedCities.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }, shadows.sm]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('travel.home.tripRoute', 'Trip Route')}
        </Text>
        {orderedCities.length >= 2 && (
          <TouchableOpacity onPress={openGoogleMapsDirections} style={styles.directionsBtn}>
            <Navigation size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {mapRegion && (
        <View style={styles.mapWrap}>
          {/* Light: standard map (native colors). Dark: midnight-like style via userInterfaceStyle="dark". */}
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation={false}
            mapType={isDark ? undefined : 'standard'}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            {orderedCities.map(
              (city, index) =>
                city.latitude != null &&
                city.longitude != null && (
                  <Marker
                    key={city.id || `city-${index}`}
                    coordinate={{
                      latitude: city.latitude,
                      longitude: city.longitude,
                    }}
                    title={city.name}
                    pinColor={theme.colors.primary}
                  />
                )
            )}
          </MapView>
        </View>
      )}

      <View style={[styles.timeline, { borderTopColor: theme.colors.glassBorder }]}>
        {totalDistance > 0 && (
          <View style={styles.statsRow}>
            <MapPin size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
              {orderedCities.length} {t('travel.home.cities', 'cities')} · {Math.round(totalDistance)} km
            </Text>
          </View>
        )}
        {orderedCities.map((city, index) => (
          <View
            key={city.id || `city-${index}`}
            style={[styles.timelineItem, { borderBottomColor: theme.colors.glassBorder }]}
          >
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.cityName, { color: theme.colors.text }]} numberOfLines={1}>
                {city.name}
              </Text>
              {city.country && (
                <Text style={[styles.cityCountry, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {city.country}
                </Text>
              )}
              {(city.startDate || city.endDate) && (
                <Text style={[styles.cityDates, { color: theme.colors.textLight }]}>
                  {formatDate(city.startDate)} – {formatDate(city.endDate)}
                </Text>
              )}
            </View>
            <Text style={[styles.timelineOrder, { color: theme.colors.textLight }]}>{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  title: { ...typography.label },
  directionsBtn: { padding: spacing.xs },
  mapWrap: {
    height: 160,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  timeline: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statsText: { ...typography.caption },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  timelineContent: { flex: 1 },
  cityName: { ...typography.body, fontWeight: '600' },
  cityCountry: { ...typography.caption, marginTop: 2 },
  cityDates: { ...typography.caption, marginTop: 2 },
  timelineOrder: { ...typography.caption },
});
