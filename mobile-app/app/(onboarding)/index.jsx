/**
 * Onboarding Step 1: Currency Selection
 *
 * Welcome screen where users select their default currency.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Coins, ChevronRight, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { impactMedium } from '../../utils/haptics';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

const CURRENCIES = [
  { code: 'EUR', symbol: '\u20ac', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00a5', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '\u00a5', name: 'Chinese Yuan' },
];

export default function OnboardingCurrencyScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { updateOnboardingData, onboardingData } = useOnboarding();
  const [selectedCurrency, setSelectedCurrency] = useState(onboardingData.currency || 'EUR');

  const handleNext = async () => {
    impactMedium();
    await updateOnboardingData({ currency: selectedCurrency });
    router.push('/(onboarding)/partner');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
        <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
        <View style={[styles.progressDot, { backgroundColor: theme.colors.surfaceSecondary }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Coins size={48} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('onboarding.currency.title', 'Welcome to Paire!')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('onboarding.currency.subtitle', 'Select your default currency to get started.')}
        </Text>
      </View>

      {/* Currency list */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyItem,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
              selectedCurrency === currency.code && { borderColor: theme.colors.primary, borderWidth: 2 },
            ]}
            onPress={() => {
              impactMedium();
              setSelectedCurrency(currency.code);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.currencySymbol, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text style={[styles.symbolText, { color: theme.colors.text }]}>{currency.symbol}</Text>
            </View>
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencyCode, { color: theme.colors.text }]}>{currency.code}</Text>
              <Text style={[styles.currencyName, { color: theme.colors.textSecondary }]}>{currency.name}</Text>
            </View>
            {selectedCurrency === currency.code && (
              <Check size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {t('onboarding.continue', 'Continue')}
          </Text>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: spacing.xl,
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
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  currencySymbol: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  symbolText: {
    ...typography.h3,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    ...typography.body,
    fontWeight: '600',
  },
  currencyName: {
    ...typography.bodySmall,
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
