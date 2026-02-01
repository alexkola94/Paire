import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId, token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const confirm = async () => {
      if (!userId || !token) { setError('Missing confirmation parameters'); setLoading(false); return; }
      try {
        await authService.confirmEmail(userId, token);
        setSuccess(true);
      } catch (err) {
        setError(err.message || 'Email confirmation failed');
      } finally { setLoading(false); }
    };
    confirm();
  }, [userId, token]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : success ? (
        <View style={styles.center}>
          <CheckCircle size={64} color={colors.success} />
          <Text style={styles.title}>{t('auth.emailConfirmed')}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.center}>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.title}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>{t('auth.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary, padding: spacing.lg },
  center: { alignItems: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
