/**
 * Onboarding Step 2: Partner Invitation
 *
 * Option to invite a partner or skip this step.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, ChevronRight, Mail, Heart } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { partnershipService } from '../../services/api';
import { impactMedium, notificationSuccess } from '../../utils/haptics';
import { useToast } from '../../components';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { validateEmail } from '../../utils/validation';

export default function OnboardingPartnerScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { updateOnboardingData } = useOnboarding();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      showToast(t('validation.required', { field: t('auth.email', 'Email') }), 'error');
      return;
    }
    if (!validateEmail(email)) {
      showToast(t('validation.email', 'Please enter a valid email'), 'error');
      return;
    }

    setLoading(true);
    try {
      await partnershipService.invite(email);
      notificationSuccess();
      showToast(t('partnership.inviteSent', 'Invitation sent!'), 'success');
      await updateOnboardingData({ skippedPartner: false });
      router.push('/(onboarding)/budget');
    } catch (error) {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    impactMedium();
    await updateOnboardingData({ skippedPartner: true });
    router.push('/(onboarding)/budget');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
          <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Users size={48} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('onboarding.partner.title', 'Better Together')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('onboarding.partner.subtitle', 'Invite your partner to share finances and track expenses together.')}
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          {[
            t('partnership.benefit1', 'Share all financial data automatically'),
            t('partnership.benefit2', 'Track who added each transaction'),
            t('partnership.benefit3', 'View partner comparison in Analytics'),
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Heart size={16} color={theme.colors.primary} />
              <Text style={[styles.benefitText, { color: theme.colors.textSecondary }]}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Email input */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <Mail size={20} color={theme.colors.textLight} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t('partnership.partnerEmail', "Partner's email")}
              placeholderTextColor={theme.colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleInvite}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.inviteButtonText}>
              {loading ? t('common.loading', 'Loading...') : t('partnership.sendInvite', 'Send Invitation')}
            </Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              {t('onboarding.skip', 'Skip for now')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.skipHint, { color: theme.colors.textSecondary }]}>
            {t('onboarding.partner.skipHint', 'You can invite a partner later from Settings.')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 24,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  benefitsContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.bodySmall,
    flex: 1,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-start',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inviteButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  skipButtonText: {
    ...typography.body,
  },
  skipHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.9,
  },
});
