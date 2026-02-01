/**
 * Paire Theme Constants
 * Ported from frontend/src/styles/index.css CSS variables
 */

export const colors = {
  primary: '#8e44ad',
  primaryLight: '#a569bd',
  primaryDark: '#7d3c98',

  secondary: '#f4ecf7',
  accent: '#d2b4de',

  // Glassmorphism
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassShadowColor: 'rgba(31, 38, 135, 0.08)',

  // Neutrals
  bgPrimary: '#fdfbfd',
  bgSecondary: '#ffffff',
  bgTertiary: '#f5f5f5',
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textLight: '#94a3b8',

  // Status
  success: '#2ecc71',
  successDark: '#27ae60',
  error: '#e74c3c',
  errorDark: '#c0392b',
  warning: '#f1c40f',
  warningDark: '#f39c12',
  info: '#3498db',
  infoDark: '#2980b9',

  // Dark mode overrides
  dark: {
    bgPrimary: '#1a1a2e',
    bgSecondary: '#16213e',
    bgTertiary: '#0f3460',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textLight: '#64748b',
    glassBg: 'rgba(26, 26, 46, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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
  },
  dark: true,
};
