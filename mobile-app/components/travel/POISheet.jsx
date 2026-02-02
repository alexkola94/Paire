/**
 * POISheet – Bottom sheet for POI details: name, address, distance, Save to trip, Open in Maps.
 * Theme-aware; used by DiscoveryMap and explore screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, Heart } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { savedPlaceService } from '../../services/api';
import { calculateDistance } from '../../services/discoveryService';

/**
 * @param {{ poi: { id?: string, poiId?: string, name: string, address?: string, latitude?: number, longitude?: number, lat?: number, lng?: number, type?: string, category?: string }, tripId: string, centerLat?: number, centerLng?: number, isSaved?: boolean, onSave?: (place: object) => void, onClose: () => void }} props
 */
export default function POISheet({ poi, tripId, centerLat, centerLng, isSaved, onSave, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!isSaved);

  const lat = poi?.latitude ?? poi?.lat ?? 0;
  const lng = poi?.longitude ?? poi?.lng ?? 0;
  const distanceKm =
    centerLat != null && centerLng != null
      ? calculateDistance(centerLat, centerLng, lat, lng)
      : null;

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleSaveToTrip = async () => {
    if (!tripId || saved || saving) return;
    setSaving(true);
    try {
      const place = {
        tripId,
        poiId: poi?.id || poi?.poiId,
        name: poi?.name || 'Unnamed',
        category: poi?.type || poi?.category || 'other',
        latitude: lat,
        longitude: lng,
        address: poi?.address || null,
      };
      await savedPlaceService.create(tripId, place);
      setSaved(true);
      onSave?.(place);
    } catch (err) {
      console.warn('POISheet save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!poi) return null;

  return (
    <View style={[styles.sheet, { backgroundColor: theme.colors.surface }, shadows.lg]}>
      <View style={[styles.handle, { backgroundColor: theme.colors.glassBorder }]} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {poi.name || t('travel.explore.unnamed', 'Unnamed')}
        </Text>
        {poi.address ? (
          <View style={styles.row}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.address, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {poi.address}
            </Text>
          </View>
        ) : null}
        {distanceKm != null && (
          <Text style={[styles.distance, { color: theme.colors.textLight }]}>
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m ${t('travel.distance.tripCenter', 'from trip center')}`
              : `${distanceKm.toFixed(1)} km ${t('travel.distance.tripCenter', 'from trip center')}`}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, { backgroundColor: theme.colors.surfaceSecondary }]}
            onPress={openInMaps}
          >
            <ExternalLink size={18} color={theme.colors.primary} />
            <Text style={[styles.btnText, { color: theme.colors.primary }]}>
              {t('travel.discovery.seeDetails', 'Open in Maps')}
            </Text>
          </TouchableOpacity>
          {!saved && (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveToTrip}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Heart size={18} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>
                    {t('travel.discovery.pinToTrip', 'Save to trip')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {saved && (
            <View style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.colors.primary + '40' }]}>
              <Heart size={18} color={theme.colors.primary} fill={theme.colors.primary} />
              <Text style={[styles.btnText, { color: theme.colors.primary }]}>
                {t('travel.discovery.unpinFromTrip', 'Saved')}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.closeRow} onPress={onClose}>
          <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>
            {t('common.close', 'Close')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '45%',
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  content: {
    flexGrow: 0,
  },
  contentInner: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  name: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  address: {
    ...typography.bodySmall,
    flex: 1,
  },
  distance: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  btnSecondary: {},
  btnPrimary: {},
  btnText: {
    ...typography.label,
  },
  closeRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  closeText: {
    ...typography.bodySmall,
  },
});
