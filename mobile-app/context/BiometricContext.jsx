/**
 * Biometric Authentication Context
 * Handles biometric (Face ID / Touch ID / Fingerprint) authentication
 * - Checks device support and manages user preference (enabled/disabled)
 * - Face ID is required only at login (when user taps Login); not when returning from background
 * - Supports different prompts for unlock vs enable (profile) flows
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { setSessionStartCallback, setSessionEndCallback } from '../services/auth';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

const BiometricContext = createContext({
  isSupported: false,
  isEnabled: false,
  isLocked: false,
  biometricType: null,
  setEnabled: async () => {},
  authenticate: async () => false,
});

export function BiometricProvider({ children }) {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;

  // Clear lock state when user logs out (so lock overlay is not shown)
  useEffect(() => {
    setSessionStartCallback(() => {
      if (isEnabledRef.current) setIsLocked(true);
    });
    setSessionEndCallback(() => setIsLocked(false));
    return () => {
      setSessionStartCallback(null);
      setSessionEndCallback(null);
    };
  }, []);

  // Check biometric support and load preferences on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if device supports biometrics
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const supported = compatible && enrolled;
        setIsSupported(supported);

        if (supported) {
          // Get biometric type
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType(Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }

          // Load user preference
          const storedPreference = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
          setIsEnabled(storedPreference === 'true');
        }
      } catch {
        // Initialization error – biometric may be unavailable
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // Authenticate using biometrics. Optional reason: 'unlock' (default) or 'enable' (shows different prompt in enable flow).
  const authenticate = useCallback(async (options = {}) => {
    const reason = options.reason ?? 'unlock';
    if (!isSupported) return false;

    const promptMessage =
      reason === 'enable'
        ? t('biometric.enablePrompt', 'Verify your identity to enable biometric unlock')
        : t('biometric.unlockPrompt', 'Unlock Paire');

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: t('common.cancel', 'Cancel'),
        disableDeviceFallback: false,
        fallbackLabel: t('biometric.usePasscode', 'Use Passcode'),
      });

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [isSupported, t]);

  // Enable/disable biometric authentication
  const setEnabled = useCallback(async (enabled) => {
    if (enabled && !isSupported) return false;

    // If enabling, first verify the user can authenticate (use enable-specific prompt)
    if (enabled) {
      const authenticated = await authenticate({ reason: 'enable' });
      if (!authenticated) {
        return false;
      }
    }

    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
      setIsEnabled(enabled);
      return true;
    } catch {
      return false;
    }
  }, [isSupported, authenticate]);

  // Manual unlock function
  const unlock = useCallback(async () => {
    if (!isLocked) return true;
    return authenticate();
  }, [isLocked, authenticate]);

  // Skip biometric lock (for testing or emergency)
  const skipLock = useCallback(() => {
    setIsLocked(false);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <BiometricContext.Provider
      value={{
        isSupported,
        isEnabled,
        isLocked,
        biometricType,
        setEnabled,
        authenticate,
        unlock,
        skipLock,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export const useBiometric = () => useContext(BiometricContext);
