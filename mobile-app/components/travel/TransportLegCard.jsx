/**
 * TransportLegCard – Leg card with API price offers + external booking deep links.
 * Shows from → to, transport mode, API-sourced offers (flights/buses), and
 * one button per deep-link provider (Skyscanner, Kiwi, FlixBus, etc.) with brand icon.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { generateTransportLink } from '../../utils/transportLinks';
import { TRANSPORT_BRAND_ICONS } from '../../constants/transportBrandIcons';
import { ExternalLink } from 'lucide-react-native';
import Skeleton from '../Skeleton';
import useTransportSearch from '../../hooks/useTransportSearch';

const BOOKABLE_MODES = ['flight', 'bus', 'ferry'];

const ICON_SIZE = 24;
const MAX_OFFERS = 3;

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  legLabel: { flex: 1 },
  legRoute: { ...typography.bodySmall, fontWeight: '500' },
  legMode: { ...typography.caption, marginTop: 2 },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  linkBtnText: { ...typography.caption, fontWeight: '600', color: '#fff' },
  brandIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 4,
  },
  // API offers styles
  offersSection: {
    marginTop: spacing.xs,
  },
  offersHeader: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  offerDetails: {
    flex: 1,
  },
  offerMainLine: {
    ...typography.caption,
    fontWeight: '500',
  },
  offerSubLine: {
    ...typography.caption,
    marginTop: 1,
  },
  offerPrice: {
    ...typography.bodySmall,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  offerBookBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  offerBookText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  offersSkeleton: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});

/**
 * Format an ISO datetime for display (HH:MM).
 */
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // Try extracting HH:MM from string like "2026-03-15T08:30:00"
    const match = iso.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * @param {{ leg: { from: string, to: string, startDate?: string | null, endDate?: string | null, transportMode?: string | null } }} props
 */
export default function TransportLegCard({ leg }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [failedIcons, setFailedIcons] = useState(new Set());
  const { offers, loading } = useTransportSearch(leg);

  const mode = (leg.transportMode && String(leg.transportMode).toLowerCase()) || null;
  const isBookable = mode && BOOKABLE_MODES.includes(mode);
  const linkData = {
    origin: leg.from,
    destination: leg.to,
    startDate: leg.startDate,
    endDate: leg.endDate,
  };
  const links = isBookable ? generateTransportLink(mode, linkData) : [];

  const handleIconError = (provider) => {
    setFailedIcons((prev) => new Set(prev).add(provider));
  };

  const displayOffers = offers.slice(0, MAX_OFFERS);
  const hasOffers = displayOffers.length > 0;

  return (
    <View style={[styles.card, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface }]}>
      <View style={styles.legLabel}>
        <Text style={[styles.legRoute, { color: theme.colors.text }]}>
          {leg.from} → {leg.to}
        </Text>
        <Text style={[styles.legMode, { color: theme.colors.textSecondary }]}>
          {mode ? t('transport.mode.' + mode, mode) : '—'}
        </Text>
      </View>

      {/* API Offers Section */}
      {loading && (
        <View style={styles.offersSkeleton}>
          <Skeleton type="rectangular" width="100%" height={56} />
          <Skeleton type="rectangular" width="100%" height={56} />
        </View>
      )}
      {!loading && hasOffers && (
        <View style={styles.offersSection}>
          <Text style={[styles.offersHeader, { color: theme.colors.text }]}>
            {t('travel.transportBooking.bestPrices', 'Best prices found')}
          </Text>
          {displayOffers.map((offer, idx) => {
            const stopsLabel =
              offer.stops === 0
                ? t('travel.transportBooking.direct', 'Direct')
                : t('travel.transportBooking.stops', { count: offer.stops, defaultValue: '{{count}} stop' });
            const detailLine =
              mode === 'flight'
                ? t('travel.transportBooking.flightOffer', {
                    airline: offer.airline || offer.provider,
                    duration: offer.duration,
                    defaultValue: '{{airline}} · {{duration}}',
                  })
                : t('travel.transportBooking.busOffer', {
                    operator: offer.operator || offer.provider,
                    duration: offer.duration,
                    defaultValue: '{{operator}} · {{duration}}',
                  });
            const depTime = formatTime(offer.departureTime);
            const arrTime = formatTime(offer.arrivalTime);
            const timeStr = depTime && arrTime ? `${depTime} – ${arrTime}` : '';

            return (
              <View
                key={`offer-${idx}`}
                style={[styles.offerRow, { borderColor: theme.colors.glassBorder }]}
              >
                <View style={styles.offerDetails}>
                  <Text style={[styles.offerMainLine, { color: theme.colors.text }]}>
                    {detailLine}
                  </Text>
                  <Text style={[styles.offerSubLine, { color: theme.colors.textSecondary }]}>
                    {[timeStr, stopsLabel].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {offer.price ? (
                  <Text style={[styles.offerPrice, { color: theme.colors.primary }]}>
                    {offer.currency === 'EUR' ? '€' : offer.currency}{offer.price}
                  </Text>
                ) : null}
                {offer.bookingUrl ? (
                  <TouchableOpacity
                    style={[styles.offerBookBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => Linking.openURL(offer.bookingUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.offerBookText}>
                      {t('travel.transportBooking.bookNow', 'Book')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Divider between offers and deep links */}
      {hasOffers && isBookable && links.length > 0 && (
        <View style={[styles.divider, { backgroundColor: theme.colors.glassBorder }]} />
      )}

      {/* Deep Link Buttons (always shown, unchanged) */}
      {isBookable && links.length > 0 ? (
        <View style={styles.linksRow}>
          {links.map((link) => {
            const brand = TRANSPORT_BRAND_ICONS[link.provider];
            const showImage = brand?.uri && !failedIcons.has(link.provider);
            return (
              <TouchableOpacity
                key={link.provider}
                style={[
                  styles.linkBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: 1,
                  },
                ]}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.8}
              >
                {showImage ? (
                  <Image
                    source={{ uri: brand.uri }}
                    style={[styles.brandIcon, { backgroundColor: '#fff' }]}
                    onError={() => handleIconError(link.provider)}
                    resizeMode="contain"
                  />
                ) : (
                  <ExternalLink size={ICON_SIZE} color="#fff" />
                )}
                <Text style={styles.linkBtnText}>{link.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.legMode, { color: theme.colors.textSecondary, marginTop: spacing.xs }]}>
          {t('travel.transportBooking.noBookingLink', 'No booking link for this transport mode')}
        </Text>
      )}
    </View>
  );
}
