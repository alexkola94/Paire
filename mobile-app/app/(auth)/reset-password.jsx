import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowLeft } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, email } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (password !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return; }
    setLoading(true); setError('');
    try {
      await authService.confirmResetPassword(token, email, password);
      setSuccess(t('auth.passwordResetSuccess'));
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch (err) {
      setError(err.message || t('auth.errors.generic'));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.title}>{t('auth.resetPassword')}</Text>
      {error ? <View style={styles.alert}><Text style={{ color: colors.error }}>{error}</Text></View> : null}
      {success ? <View style={[styles.alert, { backgroundColor: '#f0fdf4' }]}><Text style={{ color: colors.success }}>{success}</Text></View> : null}
      <View style={styles.inputWrapper}>
        <Lock size={18} color={colors.textLight} style={{ marginLeft: spacing.md }} />
        <TextInput style={styles.input} placeholder={t('auth.newPassword')} placeholderTextColor={colors.textLight}
          value={password} onChangeText={setPassword} secureTextEntry />
      </View>
      <View style={styles.inputWrapper}>
        <Lock size={18} color={colors.textLight} style={{ marginLeft: spacing.md }} />
        <TextInput style={styles.input} placeholder={t('auth.confirmPassword')} placeholderTextColor={colors.textLight}
          value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      </View>
      <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.resetPassword')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: 60, backgroundColor: colors.bgPrimary },
  backBtn: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  alert: { backgroundColor: '#fef2f2', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.md },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.md,
  },
  input: { flex: 1, padding: spacing.md, fontSize: 16, color: colors.textPrimary },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
