/**
 * Setup 2FA Screen
 * Two-step flow: start setup → enter 6-digit code from authenticator app.
 * Theme-aware (dark/light), uses auth.* i18n keys: twoFactorSetup, setupTwoFactor,
 * manualEntryKey, twoFactorCodePlaceholder, verify, setupFailed, verificationFailed.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { twoFactorService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { useToast, Modal, FormField } from '../../components';
import { spacing, borderRadius, typography } from '../../constants/theme';

// Button text/indicator on primary background (high contrast in both themes)
const ON_PRIMARY = '#fff';

export default function Setup2FAScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { theme, isDark } = useTheme();
  const [step, setStep] = useState('setup'); // setup | verify
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAlreadyEnabled, setIsAlreadyEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  // When screen gains focus (including first open), refresh user and set 2FA status so we show "already enabled" when applicable
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const resolve = async () => {
        try {
          await authService.getUser(true);
          if (!cancelled) {
            const user = authService.getCurrentUser();
            setIsAlreadyEnabled(user?.twoFactorEnabled === true);
          }
        } catch {
          if (!cancelled) {
            const user = authService.getCurrentUser();
            setIsAlreadyEnabled(user?.twoFactorEnabled === true);
          }
        } finally {
          if (!cancelled) setLoadingStatus(false);
        }
      };
      setLoadingStatus(true);
      resolve();
      return () => { cancelled = true; };
    }, [])
  );

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await twoFactorService.setup();
      setSetupData(data);
      setStep('verify');
    } catch (err) {
      setError(err.message || t('auth.setupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      await twoFactorService.enable(code);
      await authService.getUser(true);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      showToast(t('twoFactor.enableSuccess'), 'success');
      router.back();
    } catch (err) {
      setError(err.message || t('auth.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const openDisableModal = () => {
    setDisablePassword('');
    setDisableError('');
    setDisableModalOpen(true);
  };

  const closeDisableModal = () => {
    setDisableModalOpen(false);
    setDisablePassword('');
    setDisableError('');
  };

  const handleDisableSubmit = async () => {
    if (!disablePassword.trim()) return;
    setDisableLoading(true);
    setDisableError('');
    try {
      await twoFactorService.disable(disablePassword.trim());
      await authService.getUser(true);
      setIsAlreadyEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      showToast(t('twoFactor.disableSuccess'), 'success');
      closeDisableModal();
    } catch (err) {
      setDisableError(err?.message || t('twoFactor.disableError'));
    } finally {
      setDisableLoading(false);
    }
  };

  const c = theme.colors;
  const alertBg = isDark ? c.surfaceSecondary : '#fef2f2';
  const alertBorder = isDark ? c.error : 'transparent';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <ArrowLeft size={24} color={c.text} />
      </TouchableOpacity>

      <Shield size={48} color={c.primary} style={{ alignSelf: 'center' }} />
      <Text style={[styles.title, { color: c.text }]}>{t('auth.twoFactorSetup')}</Text>

      {error ? (
        <View
          style={[
            styles.alert,
            {
              backgroundColor: alertBg,
              borderWidth: isDark ? 1 : 0,
              borderColor: alertBorder,
            },
          ]}
        >
          <Text style={{ color: c.error }}>{error}</Text>
        </View>
      ) : null}

      {loadingStatus ? (
        <ActivityIndicator size="large" color={c.primary} style={styles.statusLoader} />
      ) : isAlreadyEnabled ? (
        <View style={styles.alreadyEnabledBlock}>
          <Text style={[styles.alreadyEnabledText, { color: c.textSecondary }]}>
            {t('twoFactor.alreadyEnabled')}
          </Text>
          <TouchableOpacity
            style={[styles.disableBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.error }]}
            onPress={openDisableModal}
            activeOpacity={0.8}
          >
            <Text style={[styles.disableBtnText, { color: c.error }]}>
              {t('twoFactor.disableButton')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : step === 'setup' ? (
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: c.primary },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSetup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={ON_PRIMARY} />
          ) : (
            <Text style={[styles.btnText, { color: ON_PRIMARY }]}>
              {t('auth.setupTwoFactor')}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View>
          {setupData?.manualEntryKey && (
            <View style={[styles.keyBox, { backgroundColor: c.surfaceSecondary }]}>
              <Text style={[styles.keyLabel, { color: c.textSecondary }]}>
                {t('auth.manualEntryKey')}
              </Text>
              <Text style={[styles.keyValue, { color: c.text }]} selectable>
                {setupData.manualEntryKey}
              </Text>
            </View>
          )}
          <TextInput
            style={[
              styles.codeInput,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.glassBorder,
                color: c.text,
              },
            ]}
            placeholder={t('auth.twoFactorCodePlaceholder')}
            placeholderTextColor={c.textLight}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: c.primary },
              loading && { opacity: 0.6 },
            ]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={ON_PRIMARY} />
            ) : (
              <Text style={[styles.btnText, { color: ON_PRIMARY }]}>
                {t('auth.verify')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Disable 2FA confirmation modal */}
      <Modal
        isOpen={disableModalOpen}
        onClose={closeDisableModal}
        title={t('twoFactor.disableConfirmTitle')}
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalDescription, { color: c.textSecondary }]}>
            {t('twoFactor.disableConfirmDescription')}
          </Text>
          <FormField
            label={t('auth.password')}
            value={disablePassword}
            onChangeText={(text) => { setDisablePassword(text); setDisableError(''); }}
            placeholder={t('twoFactor.enterPassword')}
            secureTextEntry
          />
          {disableError ? (
            <Text style={[styles.modalError, { color: c.error }]}>{disableError}</Text>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.glassBorder }]}
              onPress={closeDisableModal}
              disabled={disableLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelText, { color: c.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: c.error }, disableLoading && { opacity: 0.6 }]}
              onPress={handleDisableSubmit}
              disabled={!disablePassword.trim() || disableLoading}
              activeOpacity={0.8}
            >
              {disableLoading ? (
                <ActivityIndicator color={ON_PRIMARY} size="small" />
              ) : (
                <Text style={[styles.modalConfirmText, { color: ON_PRIMARY }]}>
                  {t('twoFactor.disableConfirm')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 60,
  },
  backBtn: { marginBottom: spacing.lg },
  statusLoader: { marginTop: spacing.xl },
  alreadyEnabledBlock: { marginTop: spacing.lg },
  alreadyEnabledText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  disableBtn: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  disableBtnText: { fontSize: 16, fontWeight: '600' },
  modalContent: { gap: spacing.md },
  modalDescription: { ...typography.bodySmall, marginBottom: spacing.sm },
  modalError: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  modalCancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 16, fontWeight: '600' },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  alert: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  keyBox: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  keyLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  keyValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
  codeInput: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  btn: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '600' },
});
