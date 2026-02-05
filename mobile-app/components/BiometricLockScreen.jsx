/**
 * BiometricLockScreen
 * Displayed when app is locked and requires biometric authentication.
 * Shows loading state during unlock, error message on failure, and "Use password instead" recovery.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, ScanFace, Lock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useBiometric } from '../context/BiometricContext';
import { authService } from '../services/auth';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function BiometricLockScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { biometricType, unlock } = useBiometric();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showError, setShowError] = useState(false);

  // Smooth opacity transition when entering/leaving loading state
  const buttonOpacity = useSharedValue(1);
  useEffect(() => {
    buttonOpacity.value = withTiming(isUnlocking ? 0.8 : 1, { duration: 200 });
  }, [isUnlocking]);
  const animatedButtonStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const handleUnlock = useCallback(async () => {
    setShowError(false);
    setIsUnlocking(true);
    try {
      const success = await unlock();
      if (!success) {
        setShowError(true);
      }
    } finally {
      setIsUnlocking(false);
    }
  }, [unlock]);

  const handleUsePasswordInstead = useCallback(async () => {
    await authService.signOut();
    router.replace('/(auth)/login');
  }, [router]);

  // Choose icon based on biometric type
  const BiometricIcon = biometricType?.includes('Face') ? ScanFace : Fingerprint;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
          <Lock size={48} color={theme.colors.primary} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('biometric.appLocked', 'App Locked')}
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('biometric.unlockDescription', 'Authenticate to access your financial data')}
        </Text>

        {showError && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.errorWrap}
          >
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t('biometric.tryAgain', 'Authentication failed. Try again.')}
            </Text>
          </Animated.View>
        )}

        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleUnlock}
            activeOpacity={0.8}
            disabled={isUnlocking}
          >
          {isUnlocking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <BiometricIcon size={24} color="#FFFFFF" />
          )}
          <Text style={styles.unlockButtonText}>
            {isUnlocking
              ? t('common.loading', 'Loading...')
              : biometricType
                ? t('biometric.unlockWith', { type: biometricType, defaultValue: `Unlock with ${biometricType}` })
                : t('biometric.unlock', 'Unlock')}
          </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.usePasswordTouch}
          onPress={handleUsePasswordInstead}
          activeOpacity={0.7}
          disabled={isUnlocking}
        >
          <Text style={[styles.usePasswordText, { color: theme.colors.primary }]}>
            {t('biometric.usePasswordInstead', 'Use password instead')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.appName, { color: theme.colors.textSecondary }]}>
        Paire
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  errorWrap: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  unlockButtonText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  usePasswordTouch: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  usePasswordText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
  appName: {
    ...typography.caption,
    position: 'absolute',
    bottom: spacing.xl,
  },
});
