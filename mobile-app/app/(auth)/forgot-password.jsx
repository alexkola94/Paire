import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!email) { setError(t('messages.fillRequired')); return; }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(email);
      setSuccess(t('auth.resetPasswordEmailSent'));
    } catch (err) {
      setError(err.message || t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgotPasswordDescription')}</Text>

        {error ? <View style={styles.alertError}><Text style={styles.alertErrorText}>{error}</Text></View> : null}
        {success ? <View style={styles.alertSuccess}><Text style={styles.alertSuccessText}>{success}</Text></View> : null}

        <View style={styles.inputWrapper}>
          <Mail size={18} color={colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.sendResetLink')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  alertError: { backgroundColor: '#fef2f2', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.md },
  alertErrorText: { color: colors.error, fontSize: 14 },
  alertSuccess: { backgroundColor: '#f0fdf4', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.md },
  alertSuccessText: { color: colors.success, fontSize: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgTertiary, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.lg,
  },
  inputIcon: { marginLeft: spacing.md },
  input: { flex: 1, padding: spacing.md, fontSize: 16, color: colors.textPrimary },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
