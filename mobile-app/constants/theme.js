/**
 * Paire Theme Constants
 * Ported from frontend/src/styles/index.css CSS variables
 */

// Paire Design System: Royal Amethyst primary, soft neutrals
export const colors = {
  primary: '#8B5CF6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',

  secondary: '#f4ecf7',
  accent: '#d2b4de',

  // Glassmorphism (blur + translucent surfaces)
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassShadowColor: 'rgba(31, 38, 135, 0.08)',
  // Blur effect tokens (for BlurView / backdrop blur)
  blurIntensity: 70,

  // Neutrals
  bgPrimary: '#fdfbfd',
  bgSecondary: '#ffffff',
  bgTertiary: '#f5f5f5',
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textLight: '#94a3b8',

  // Status (Paire: Vitality Green, Coral for expenses)
  success: '#10B981',
  successDark: '#059669',
  error: '#EF4444',
  errorDark: '#dc2626',
  warning: '#f1c40f',
  warningDark: '#f39c12',
  info: '#3498db',
  infoDark: '#2980b9',

  // Modal overlay (date picker, bottom sheets) — light
  overlay: 'rgba(0,0,0,0.48)',

  // Dark mode overrides (deep purple-tinted)
  // Improved contrast ratios for accessibility
  dark: {
    bgPrimary: '#0F071A',
    bgSecondary: '#1a1a2e',
    bgTertiary: '#16213e',
    textPrimary: '#f1f5f9', // Improved: brighter for better contrast
    textSecondary: '#a1afc4', // Improved: lighter for better readability
    textLight: '#7d8ca0', // Improved: more visible on dark backgrounds
    glassBg: 'rgba(26, 26, 46, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.14)', // Improved: more visible borders
    overlay: 'rgba(0,0,0,0.7)',
    blurIntensity: 70,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Bottom padding for scroll content so floating tab bar does not hide content */
  tabBarBottomClearance: 100,
};

export const borderRadius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
};

export const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
};

export const lightTheme = {
  colors: {
    ...colors,
    background: colors.bgPrimary,
    surface: colors.bgSecondary,
    surfaceSecondary: colors.bgTertiary,
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textLight: colors.textLight,
    glassBg: colors.glassBg,
    glassBorder: colors.glassBorder,
    overlay: colors.overlay,
    blurIntensity: colors.blurIntensity ?? 70,
  },
  dark: false,
};

export const darkTheme = {
  colors: {
    ...colors,
    background: colors.dark.bgPrimary,
    surface: colors.dark.bgSecondary,
    surfaceSecondary: colors.dark.bgTertiary,
    text: colors.dark.textPrimary,
    textSecondary: colors.dark.textSecondary,
    textLight: colors.dark.textLight,
    glassBg: colors.dark.glassBg,
    glassBorder: colors.dark.glassBorder,
    overlay: colors.dark.overlay,
    blurIntensity: colors.dark.blurIntensity ?? 70,
  },
  dark: true,
};
