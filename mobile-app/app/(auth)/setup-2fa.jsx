import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { twoFactorService } from '../../services/api';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function Setup2FAScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState('setup'); // setup | verify
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true); setError('');
    try {
      const data = await twoFactorService.setup();
      setSetupData(data);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setLoading(true); setError('');
    try {
      await twoFactorService.enable(code);
      router.back();
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Shield size={48} color={colors.primary} style={{ alignSelf: 'center' }} />
      <Text style={styles.title}>{t('auth.twoFactorSetup')}</Text>

      {error ? <View style={styles.alert}><Text style={{ color: colors.error }}>{error}</Text></View> : null}

      {step === 'setup' ? (
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSetup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.setupTwoFactor')}</Text>}
        </TouchableOpacity>
      ) : (
        <View>
          {setupData?.manualEntryKey && (
            <View style={styles.keyBox}>
              <Text style={styles.keyLabel}>{t('auth.manualEntryKey')}</Text>
              <Text style={styles.keyValue} selectable>{setupData.manualEntryKey}</Text>
            </View>
          )}
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor={colors.textLight}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.verify')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center', marginVertical: spacing.lg },
  alert: { backgroundColor: '#fef2f2', borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.md },
  keyBox: { backgroundColor: colors.bgTertiary, borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.lg },
  keyLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  keyValue: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 14, color: colors.textPrimary },
  codeInput: {
    backgroundColor: colors.bgTertiary, borderRadius: borderRadius.sm, padding: spacing.md,
    fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.glassBorder, color: colors.textPrimary,
  },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: spacing.md, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
