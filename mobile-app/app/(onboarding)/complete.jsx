/**
 * Onboarding Complete Screen
 *
 * Celebration screen after completing onboarding.
 */

import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PartyPopper, ArrowRight, CheckCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { impactMedium, notificationSuccess } from '../../utils/haptics';
import { spacing, borderRadius, typography } from '../../constants/theme';

export default function OnboardingCompleteScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { completeOnboarding, onboardingData } = useOnboarding();

  // Animation values
  const iconScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const checklistOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Trigger animations
    notificationSuccess();
    iconScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    titleOpacity.value = withDelay(300, withSpring(1));
    checklistOpacity.value = withDelay(600, withSpring(1));
    buttonOpacity.value = withDelay(900, withSpring(1));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const checklistAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checklistOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleContinue = async () => {
    impactMedium();
    await completeOnboarding();
    router.replace('/(app)/(tabs)/dashboard');
  };

  const completedItems = [
    { key: 'currency', label: t('onboarding.complete.currencySet', 'Default currency selected'), done: true },
    { key: 'partner', label: t('onboarding.complete.partnerInvited', 'Partner invited'), done: !onboardingData.skippedPartner },
    { key: 'budget', label: t('onboarding.complete.budgetCreated', 'First budget created'), done: onboardingData.createdBudget },
    { key: 'transaction', label: t('onboarding.complete.transactionAdded', 'First expense added'), done: onboardingData.createdTransaction },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View style={[styles.iconContainer, { backgroundColor: `${theme.colors.success}15` }, iconAnimatedStyle]}>
          <PartyPopper size={64} color={theme.colors.success} />
        </Animated.View>

        {/* Title */}
        <Animated.View style={titleAnimatedStyle}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('onboarding.complete.title', "You're All Set!")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('onboarding.complete.subtitle', 'Welcome to Paire! Your financial journey begins now.')}
          </Text>
        </Animated.View>

        {/* Checklist */}
        <Animated.View style={[styles.checklist, checklistAnimatedStyle]}>
          {completedItems.map((item) => (
            <View key={item.key} style={styles.checklistItem}>
              <CheckCircle
                size={20}
                color={item.done ? theme.colors.success : theme.colors.textLight}
              />
              <Text style={[
                styles.checklistText,
                { color: item.done ? theme.colors.text : theme.colors.textLight },
                !item.done && styles.checklistTextSkipped,
              ]}>
                {item.label}
                {!item.done && ` (${t('onboarding.skipped', 'skipped')})`}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Continue button */}
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {t('onboarding.complete.continue', 'Go to Dashboard')}
          </Text>
          <ArrowRight size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  checklist: {
    width: '100%',
    gap: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checklistText: {
    ...typography.body,
  },
  checklistTextSkipped: {
    fontStyle: 'italic',
  },
  footer: {
    padding: spacing.lg,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  continueButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
