/**
 * Bank Callback Screen (React Native)
 * Handles OAuth callback from bank authorization when returning to the app
 * via deep link (e.g. paire://bank-callback?success=true or ?error=...).
 * Shows processing/success/error and then navigates back to Profile.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

export default function BankCallbackScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = params.success;
    const error = params.error;

    if (error) {
      setStatus('error');
      setMessage(t('profile.openBanking.callback.bankError', 'Bank authorization was cancelled or failed.'));
      const tid = setTimeout(() => router.replace('/(app)/profile'), 3000);
      return () => clearTimeout(tid);
    }

    if (success === 'true' || success === true) {
      setStatus('success');
      setMessage(t('profile.openBanking.connectionSuccess', 'Bank account connected successfully!'));
      const tid = setTimeout(() => router.replace('/(app)/profile'), 2500);
      return () => clearTimeout(tid);
    }

    setStatus('error');
    setMessage(t('profile.openBanking.callback.missingParams', 'Missing authorization parameters.'));
    const tid = setTimeout(() => router.replace('/(app)/profile'), 3000);
    return () => clearTimeout(tid);
  }, [params.success, params.error, router, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('profile.openBanking.callback.processing', 'Processing Authorization...')}
            </Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {t('profile.openBanking.callback.processingMessage', 'Please wait while we complete your bank connection.')}
            </Text>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={64} color={theme.colors.success} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('common.success', 'Success!')}
            </Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
            <Text style={[styles.hint, { color: theme.colors.textLight }]}>
              {t('profile.openBanking.callback.closing', 'This window will close automatically...')}
            </Text>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={64} color={theme.colors.error} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('common.error', 'Error')}
            </Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
            <Text style={[styles.hint, { color: theme.colors.textLight }]}>
              {t('profile.openBanking.callback.closing', 'This window will close automatically...')}
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  title: {
    ...typography.h2,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  hint: {
    ...typography.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
