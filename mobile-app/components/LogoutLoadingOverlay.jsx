/**
 * LogoutLoadingOverlay
 * Full-screen loading overlay during logout. Matches the app splash screen layout
 * (Paire logo, ring, app name, loading dots) and adds a "Logging out..." indicator.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useLogout } from '../context/LogoutContext';
import { spacing, typography, colors } from '../constants/theme';
import { PaireLogo, LoadingDot, SPLASH_LOGO_SIZE } from './SplashScreen';

const LOGO_SIZE = SPLASH_LOGO_SIZE;
const FADE_DURATION = 220;

export default function LogoutLoadingOverlay() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isLoggingOut } = useLogout();
  const reducedMotion = useReducedMotion();

  // Match splash: gentle logo pulse and ring pulse
  const logoScale = useSharedValue(1);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isLoggingOut) return;
    if (!reducedMotion) {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 1500, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [isLoggingOut, reducedMotion]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!isLoggingOut) return null;

  return (
    <Modal
      visible={isLoggingOut}
      transparent
      statusBarTranslucent
      animationType="none"
    >
      <Animated.View
        entering={FadeIn.duration(FADE_DURATION)}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Logo area – same as splash */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: theme.colors.primary },
              ringAnimatedStyle,
            ]}
          />
          <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
            <PaireLogo size={LOGO_SIZE} />
          </Animated.View>
        </View>

        {/* App name + logout indicator */}
        <View style={styles.textBlock}>
          <Text style={[styles.appName, { color: theme.colors.text }]}>
            {t('app.title')}
          </Text>
          <Text style={[styles.logoutMessage, { color: theme.colors.textSecondary }]}>
            {t('auth.loggingOut', 'Logging out...')}
          </Text>
        </View>

        {/* Same loading dots as splash */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <LoadingDot key={i} delay={i * 200} theme={theme} />
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    width: LOGO_SIZE + 40,
    height: LOGO_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE + 30,
    height: LOGO_SIZE + 30,
    borderRadius: (LOGO_SIZE + 30) / 2,
    borderWidth: 2,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  logoutMessage: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
