/**
 * TransportLegCard – Shared leg card for transport booking (from → to + provider links).
 * Used by MultiCityTripWizard and single-destination Add Trip wizard.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { generateTransportLink } from '../../utils/transportLinks';
import { isKiwiTequilaEnabled, searchFlights as kiwiSearchFlights } from '../../services/kiwiTequilaService';
import { isSkyscannerEnabled, searchFlights as skyscannerSearchFlights, resolveToIata } from '../../services/skyscannerService';
import { isTripGoEnabled, searchRoutesByPlaces } from '../../services/tripGoService';

const BOOKABLE_MODES = ['flight', 'bus', 'ferry'];

const formatDuration = (minutes) => {
  if (minutes == null || minutes < 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

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
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  linkBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  linkBtnText: { ...typography.caption, fontWeight: '600', color: '#fff' },
  resultsBox: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.xs, marginBottom: spacing.xs },
  resultsLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  resultsError: { padding: spacing.sm },
});

/**
 * @param {{ leg: { from: string, to: string, startDate?: string | null, endDate?: string | null, transportMode?: string | null } }} props
 */
export default function TransportLegCard({ leg }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isBookable = leg.transportMode && BOOKABLE_MODES.includes(leg.transportMode);
  const linkData = {
    origin: leg.from,
    destination: leg.to,
    startDate: leg.startDate,
    endDate: leg.endDate,
  };
  const links = isBookable ? generateTransportLink(leg.transportMode, linkData) : [];

  const runFlightSearch = useCallback(async (provider) => {
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    try {
      if (provider === 'kiwi') {
        const list = await kiwiSearchFlights({
          flyFrom: leg.from,
          flyTo: leg.to,
          dateFrom: leg.startDate || '',
          dateTo: leg.startDate || leg.endDate || '',
          returnFrom: leg.endDate || undefined,
          returnTo: leg.endDate || undefined,
          adults: 1,
        });
        setSearchResults(list || []);
      } else if (provider === 'skyscanner') {
        const originIata = resolveToIata(leg.from || '');
        const destIata = resolveToIata(leg.to || '');
        if (!originIata || !destIata) {
          setSearchError(t('travel.transportBooking.errorOriginDest', 'Could not resolve origin or destination.'));
          return;
        }
        const list = await skyscannerSearchFlights({
          originIata,
          destinationIata,
          outboundDate: leg.startDate || leg.endDate || '',
          returnDate: leg.endDate || undefined,
          adults: 1,
        });
        setSearchResults(list || []);
      }
    } catch (err) {
      setSearchError(err?.message || String(err));
    } finally {
      setSearchLoading(false);
    }
  }, [leg, t]);

  const runBusSearch = useCallback(async () => {
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const list = await searchRoutesByPlaces({
        fromPlace: leg.from || leg.to || '',
        toPlace: leg.to || leg.from || '',
        departAfter: leg.startDate ? Math.floor(new Date(leg.startDate).getTime() / 1000) : undefined,
      });
      setSearchResults(list || []);
    } catch (err) {
      setSearchError(err?.message || String(err));
    } finally {
      setSearchLoading(false);
    }
  }, [leg]);

  const isFlight = leg.transportMode === 'flight';
  const isBus = leg.transportMode === 'bus';
  const showSearchResults = searchResults.length > 0 || searchLoading || searchError;

  return (
    <View style={[styles.card, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface }]}>
      <View style={styles.legLabel}>
        <Text style={[styles.legRoute, { color: theme.colors.text }]}>
          {leg.from} → {leg.to}
        </Text>
        <Text style={[styles.legMode, { color: theme.colors.textSecondary }]}>
          {leg.transportMode ? t('transport.mode.' + leg.transportMode, leg.transportMode) : '—'}
        </Text>
      </View>
      {isBookable && links.length > 0 ? (
        <>
          <View style={styles.linksRow}>
            {isFlight && isKiwiTequilaEnabled() && (
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: theme.colors.primary, opacity: searchLoading ? 0.7 : 1 }]}
                onPress={() => runFlightSearch('kiwi')}
                disabled={searchLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.linkBtnText}>{t('travel.transportBooking.searchPrices', 'Search prices')} – Kiwi</Text>
              </TouchableOpacity>
            )}
            {isFlight && isSkyscannerEnabled() && (
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: theme.colors.primary, opacity: searchLoading ? 0.7 : 1 }]}
                onPress={() => runFlightSearch('skyscanner')}
                disabled={searchLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.linkBtnText}>{t('travel.transportBooking.searchPrices', 'Search prices')} – Skyscanner</Text>
              </TouchableOpacity>
            )}
            {isBus && isTripGoEnabled() && (
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: theme.colors.primary, opacity: searchLoading ? 0.7 : 1 }]}
                onPress={runBusSearch}
                disabled={searchLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.linkBtnText}>{t('travel.transportBooking.searchPrices', 'Search prices')} – TripGo</Text>
              </TouchableOpacity>
            )}
            {links.map((link) => (
              <TouchableOpacity
                key={link.provider}
                style={[styles.linkBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.8}
              >
                <Text style={styles.linkBtnText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {showSearchResults && (
            <View style={[styles.resultsBox, { borderColor: theme.colors.glassBorder, backgroundColor: theme.colors.surface }]}>
              {searchLoading && (
                <View style={styles.resultsLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>{t('travel.transportBooking.searching', 'Searching...')}</Text>
                </View>
              )}
              {searchError && !searchLoading && (
                <Text style={[styles.resultsError, { color: theme.colors.textSecondary }]}>{searchError}</Text>
              )}
              {!searchLoading && searchResults.length > 0 && searchResults.map((item) => (
                <View key={item.id} style={[styles.resultsRow, { backgroundColor: theme.colors.background || 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {item.price > 0 ? `${item.currency || 'EUR'} ${Number(item.price).toFixed(0)}` : '—'} · {formatDuration(item.durationMinutes ?? item.duration?.total)} {item.provider ? `· ${item.provider}` : ''}
                  </Text>
                  {item.bookUrl ? (
                    <TouchableOpacity onPress={() => Linking.openURL(item.bookUrl)} style={[styles.linkBtn, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.linkBtnText}>{t('travel.transportBooking.book', 'Book')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.legMode, { color: theme.colors.textSecondary, marginTop: spacing.xs }]}>
          {t('travel.transportBooking.noBookingLink', 'No booking link for this transport mode')}
        </Text>
      )}
    </View>
  );
}
