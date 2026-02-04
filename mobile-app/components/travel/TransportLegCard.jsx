/**
 * TransportLegCard – Shared leg card for transport booking (from → to + provider links).
 * Used by MultiCityTripWizard and single-destination Add Trip wizard.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { generateTransportLink } from '../../utils/transportLinks';

const BOOKABLE_MODES = ['flight', 'bus', 'ferry'];

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
});

/**
 * @param {{ leg: { from: string, to: string, startDate?: string | null, endDate?: string | null, transportMode?: string | null } }} props
 */
export default function TransportLegCard({ leg }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isBookable = leg.transportMode && BOOKABLE_MODES.includes(leg.transportMode);
  const links = isBookable
    ? generateTransportLink(leg.transportMode, {
        origin: leg.from,
        destination: leg.to,
        startDate: leg.startDate,
        endDate: leg.endDate,
      })
    : [];

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
        <View style={styles.linksRow}>
          {links.map((link) => (
            <TouchableOpacity
              key={link.provider}
              style={[styles.linkBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.8}
            >
              <Text style={styles.linkBtnText}>
                {t('travel.transportBooking.openInNewTab', 'Search')} – {link.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={[styles.legMode, { color: theme.colors.textSecondary, marginTop: spacing.xs }]}>
          {t('travel.transportBooking.noBookingLink', 'No booking link for this transport mode')}
        </Text>
      )}
    </View>
  );
}
