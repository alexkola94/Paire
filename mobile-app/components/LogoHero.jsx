/**
 * LogoHero Component
 *
 * Displays the Paire logo with app name. Used in the drawer (larger) and
 * optionally in the app header (compact). Theme-aware; uses typography and
 * spacing from the design system.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';
import { useTranslation } from 'react-i18next';

// Gradient colors for signature underline (match logo gradient)
const SIGNATURE_GRADIENT = ['#6c5ce7', '#4a3f8f'];

const LOGO_SIZE_DRAWER = 48;
const LOGO_SIZE_HEADER = 28;
/** Larger logo for auth screens (login, etc.) */
const LOGO_SIZE_AUTH = 88;
/** Padding around logo inside the frosted circle on auth screens */
const AUTH_LOGO_PADDING = 14;

/**
 * Inline Paire logo (geometric P forms) – matches assets/paire-logo.svg
 */
function PaireLogoSvg({ size }) {
  const scale = size / 200;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id="paireGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#6c5ce7" stopOpacity={1} />
          <Stop offset="100%" stopColor="#4a3f8f" stopOpacity={1} />
        </LinearGradient>
        <LinearGradient id="paireGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#a29bfe" stopOpacity={1} />
          <Stop offset="100%" stopColor="#6c5ce7" stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Path
        d="M45 40 L45 160 L75 160 L75 115 L95 115 Q120 115 120 85 Q120 55 95 55 L75 55 L75 40 Z M75 75 L90 75 Q100 75 100 85 Q100 95 90 95 L75 95 Z"
        fill="url(#paireGrad1)"
        fillRule="evenodd"
      />
      <Path
        d="M85 50 L85 170 L115 170 L115 125 L135 125 Q160 125 160 95 Q160 65 135 65 L115 65 L115 50 Z M115 85 L130 85 Q140 85 140 95 Q140 105 130 105 L115 105 Z"
        fill="url(#paireGrad2)"
        fillRule="evenodd"
        opacity={0.85}
      />
    </Svg>
  );
}

// Light text colors for auth screens (e.g. login gradient background)
const AUTH_TITLE_COLOR = '#fff';
const AUTH_TAGLINE_COLOR = 'rgba(255,255,255,0.8)';

/**
 * LogoHero – drawer (vertical, larger), header (horizontal, compact), or auth (drawer + light text, no border)
 * @param { 'drawer' | 'header' | 'auth' } variant
 */
export default function LogoHero({ variant = 'drawer' }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDrawer = variant === 'drawer' || variant === 'auth';
  const isAuth = variant === 'auth';
  const logoSize = isAuth ? LOGO_SIZE_AUTH : (isDrawer ? LOGO_SIZE_DRAWER : LOGO_SIZE_HEADER);

  if (isDrawer) {
    const titleColor = isAuth ? AUTH_TITLE_COLOR : theme.colors.text;
    const taglineColor = isAuth ? AUTH_TAGLINE_COLOR : theme.colors.textSecondary;
    return (
      <View style={[
        styles.drawerRoot,
        isAuth && styles.drawerRootAuth,
        !isAuth && { borderBottomColor: theme.colors.glassBorder },
      ]}>
        {isAuth ? (
          <View
            style={[
              styles.authLogoWrapper,
              {
                width: logoSize + 2 * AUTH_LOGO_PADDING,
                height: logoSize + 2 * AUTH_LOGO_PADDING,
                borderRadius: (logoSize + 2 * AUTH_LOGO_PADDING) / 2,
              },
            ]}
          >
            <PaireLogoSvg size={logoSize} />
          </View>
        ) : (
          <PaireLogoSvg size={logoSize} />
        )}
        <Text style={[styles.drawerTitle, { color: titleColor }]} numberOfLines={1}>
          {t('app.name', 'Paire')}
        </Text>
        <Text style={[styles.drawerTagline, { color: taglineColor }]} numberOfLines={1}>
          {t('app.tagline', 'Finances, aligned.')}
        </Text>
        <ExpoLinearGradient
          colors={SIGNATURE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={isAuth ? styles.signatureUnderlineAuth : styles.signatureUnderline}
        />
      </View>
    );
  }

  return (
    <View style={styles.headerRoot}>
      <PaireLogoSvg size={logoSize} />
      <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
        {t('app.name', 'Paire')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  /** Auth variant: no border, centered content (used on gradient backgrounds) */
  drawerRootAuth: {
    borderBottomWidth: 0,
    alignItems: 'center',
  },
  drawerTitle: {
    ...typography.h2,
  },
  drawerTagline: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  signatureUnderline: {
    width: '80%',
    alignSelf: 'flex-start',
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  /** Auth variant: underline centered under tagline */
  signatureUnderlineAuth: {
    width: '80%',
    alignSelf: 'center',
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  /** Auth variant: frosted circular background so logo stands out on gradient */
  authLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.label,
  },
});
