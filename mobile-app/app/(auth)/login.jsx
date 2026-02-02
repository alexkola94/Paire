import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

const KEEP_LOGGED_IN_KEY = 'auth_keep_logged_in';

function humanizeLoginError(err, isSignUp, t) {
  const msg = (err?.message || '').toLowerCase();
  if (err?.name === 'TypeError' || msg.includes('network')) return t('auth.errors.networkError');
  if (msg.includes('invalid') || msg.includes('401')) return t('auth.errors.invalidCredentials');
  if (msg.includes('confirm your email')) return t('auth.errors.emailNotConfirmed');
  if (msg.includes('locked')) return t('auth.errors.accountLocked');
  if (isSignUp && (msg.includes('already') || msg.includes('duplicate'))) return t('auth.errors.emailAlreadyRegistered');
  const raw = err?.message || '';
  if (raw.length > 0 && raw.length < 120) return raw;
  return t('auth.errors.generic');
}

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams();
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  // Sync sign-up mode when navigating with ?mode=signup (e.g. from Landing)
  useEffect(() => {
    if (mode === 'signup') setIsSignUp(true);
  }, [mode]);

  // Restore "Keep me logged in" preference from last visit
  useEffect(() => {
    AsyncStorage.getItem(KEEP_LOGGED_IN_KEY).then((stored) => {
      if (stored !== null) setKeepLoggedIn(stored === 'true');
    });
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Use functional updates for setFormData so that when iOS Password AutoFill fills both
  // email and password, the password handler doesn't overwrite state with stale formData
  // (which would have email: '') and erase the autofilled email.

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      setError(t('messages.fillRequired'));
      return;
    }
    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        await authService.signUp(formData.email, formData.password);
        setSuccess(t('auth.registrationSuccess'));
        setTimeout(() => setIsSignUp(false), 2000);
      } else {
        const response = await authService.signIn(formData.email, formData.password, keepLoggedIn);
        if (response.requiresTwoFactor) {
          // TODO: navigate to 2FA screen
          setError('2FA required - not yet implemented in mobile');
        } else {
          router.replace('/(app)/(tabs)/dashboard');
        }
      }
    } catch (err) {
      setError(humanizeLoginError(err, isSignUp, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.brandTitle}>{t('app.title')}</Text>
            <Text style={styles.brandTagline}>{t('app.tagline')}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
            </Text>

            {error ? <View style={styles.alertError}><Text style={styles.alertErrorText}>{error}</Text></View> : null}
            {success ? <View style={styles.alertSuccess}><Text style={styles.alertSuccessText}>{success}</Text></View> : null}

            {/* Email — on login use textContentType="username" so iOS Password AutoFill fills this field when the user picks a saved credential; on sign-up use "emailAddress". */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={formData.email}
                  onChangeText={(text) => { setFormData((prev) => ({ ...prev, email: text })); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType={isSignUp ? 'emailAddress' : 'username'}
                />
              </View>
            </View>

            {/* Password — textContentType helps iOS Password AutoFill match username + password */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={formData.password}
                  onChangeText={(text) => { setFormData((prev) => ({ ...prev, password: text })); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} color={colors.textLight} /> : <Eye size={18} color={colors.textLight} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor={colors.textLight}
                    value={formData.confirmPassword}
                    onChangeText={(text) => { setFormData((prev) => ({ ...prev, confirmPassword: text })); setError(''); }}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    {showConfirmPassword ? <EyeOff size={18} color={colors.textLight} /> : <Eye size={18} color={colors.textLight} />}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Forgot Password */}
            {!isSignUp && (
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity style={styles.forgotLink}>
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              </Link>
            )}

            {/* Keep me logged in (login only) */}
            {!isSignUp && (
              <View style={styles.rememberMeRow}>
                <Text style={styles.rememberMeLabel}>{t('auth.rememberMe')}</Text>
                <Switch
                  value={keepLoggedIn}
                  onValueChange={(value) => {
                    setKeepLoggedIn(value);
                    AsyncStorage.setItem(KEEP_LOGGED_IN_KEY, value ? 'true' : 'false');
                  }}
                  trackColor={{ false: colors.bgTertiary, true: colors.primaryLight }}
                  thumbColor={keepLoggedIn ? colors.primary : colors.textLight}
                />
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? t('auth.signup') : t('auth.login')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms & Privacy links (sign-up) */}
            {isSignUp && (
              <View style={styles.legalRow}>
                <Text style={styles.legalText}>{t('auth.agreeToTerms')} </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/terms-of-service')}>
                  <Text style={styles.legalLink}>{t('legal.termsOfService')}</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> {t('common.and')} </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/privacy-policy')}>
                  <Text style={styles.legalLink}>{t('legal.privacyPolicy')}</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}>.</Text>
              </View>
            )}

            {/* Toggle mode */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
              </Text>
              <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}>
                <Text style={styles.toggleText}>
                  {isSignUp ? t('auth.login') : t('auth.signup')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  branding: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  brandTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  alertError: {
    backgroundColor: '#fef2f2',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertErrorText: { color: colors.error, fontSize: 14 },
  alertSuccess: {
    backgroundColor: '#f0fdf4',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertSuccessText: { color: colors.success, fontSize: 14 },
  inputGroup: { marginBottom: spacing.md },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inputIcon: { marginLeft: spacing.md },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeBtn: { padding: spacing.md },
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.md },
  forgotText: { color: colors.primary, fontSize: 14 },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  rememberMeLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  toggleText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  legalText: { color: colors.textSecondary, fontSize: 12 },
  legalLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
