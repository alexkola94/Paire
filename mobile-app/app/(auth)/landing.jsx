/**
 * Landing Screen (React Native)
 * Hero, features, stats, and CTAs for unauthenticated users.
 * Ported from frontend Landing.jsx; uses publicStatsService.getStats() and Paire design.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  Users,
  Target,
  Shield,
  Check,
  ArrowRight,
  PieChart,
  Bell,
  ShoppingCart,
  MapPin,
  TrendingUp,
} from 'lucide-react-native';
import { publicStatsService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';

// Feature row: icon key, title key
const FEATURE_KEYS = [
  { icon: DollarSign, titleKey: 'landing.features.tracking.title' },
  { icon: Users, titleKey: 'landing.features.partnership.title' },
  { icon: PieChart, titleKey: 'landing.features.analytics.title' },
  { icon: Target, titleKey: 'landing.features.budgets.title' },
  { icon: Bell, titleKey: 'landing.features.reminders.title' },
  { icon: ShoppingCart, titleKey: 'landing.features.shopping.title' },
  { icon: MapPin, titleKey: 'landing.features.travel.title' },
];

const STEP_KEYS = [
  { number: '01', titleKey: 'landing.howItWorks.step1.title', descKey: 'landing.howItWorks.step1.description' },
  { number: '02', titleKey: 'landing.howItWorks.step2.title', descKey: 'landing.howItWorks.step2.description' },
  { number: '03', titleKey: 'landing.howItWorks.step3.title', descKey: 'landing.howItWorks.step3.description' },
];

export default function LandingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({
    formattedUsers: '0',
    formattedTransactions: '0',
    formattedMoneySaved: '€0',
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await publicStatsService.getStats();
        setStats({
          formattedUsers: data.formattedUsers || '0',
          formattedTransactions: data.formattedTransactions || '0',
          formattedMoneySaved: data.formattedMoneySaved || '€0',
        });
      } catch (err) {
        // Keep defaults on error
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const goToLogin = () => router.push('/(auth)/login');
  const goToSignUp = () => router.push({ pathname: '/(auth)/login', params: { mode: 'signup' } });
  const goToPrivacy = () => router.push('/(auth)/privacy-policy');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}>
            <Shield size={14} color={theme.colors.primary} />
            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
              {t('landing.hero.badge')}
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            {t('landing.hero.title')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            {t('landing.hero.subtitle')}
          </Text>
          <View style={styles.heroActions}>
            <Button
              title={t('landing.hero.getStarted')}
              onPress={goToSignUp}
              variant="primary"
              rightIcon={ArrowRight}
              style={styles.heroPrimaryBtn}
            />
            <Button
              title={t('landing.hero.login')}
              onPress={goToLogin}
              variant="outline"
              style={styles.heroSecondaryBtn}
            />
          </View>
          <View style={styles.trust}>
            <View style={styles.trustItem}>
              <Check size={16} color={theme.colors.primary} />
              <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>{t('landing.hero.trust1')}</Text>
            </View>
            <View style={styles.trustItem}>
              <Check size={16} color={theme.colors.primary} />
              <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>{t('landing.hero.trust2')}</Text>
            </View>
            <View style={styles.trustItem}>
              <Check size={16} color={theme.colors.primary} />
              <Text style={[styles.trustText, { color: theme.colors.textSecondary }]}>{t('landing.hero.trust3')}</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('landing.features.title')}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>{t('landing.features.subtitle')}</Text>
          {FEATURE_KEYS.map(({ icon: Icon, titleKey }, i) => (
            <View key={i} style={[styles.featureCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Icon size={22} color={theme.colors.primary} />
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{t(titleKey)}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('landing.howItWorks.title')}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>{t('landing.howItWorks.subtitle')}</Text>
          {STEP_KEYS.map(({ number, titleKey, descKey }, i) => (
            <View key={i} style={[styles.stepCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.stepNumber, { color: theme.colors.primary }]}>{number}</Text>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{t(titleKey)}</Text>
              <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]}>{t(descKey)}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          {statsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.statsLoader} />
          ) : (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.formattedUsers}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('landing.stats.users')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.formattedTransactions}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('landing.stats.transactions')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
                <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.formattedMoneySaved}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('landing.stats.saved')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* CTA */}
        <View style={[styles.ctaBlock, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Text style={[styles.ctaTitle, { color: theme.colors.text }]}>{t('landing.cta.title')}</Text>
          <Text style={[styles.ctaSubtitle, { color: theme.colors.textSecondary }]}>{t('landing.cta.subtitle')}</Text>
          <Button
            title={t('landing.cta.button')}
            onPress={goToSignUp}
            variant="primary"
            rightIcon={ArrowRight}
            style={styles.ctaButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={goToPrivacy} activeOpacity={0.7}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>{t('landing.footer.privacy')}</Text>
          </TouchableOpacity>
          <Text style={[styles.footerCopyright, { color: theme.colors.textSecondary }]}>
            {t('landing.footer.copyright', { year: new Date().getFullYear() })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.xl * 2 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  badgeText: { ...typography.caption, fontWeight: '600' },
  heroTitle: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.sm },
  heroSubtitle: { ...typography.body, marginBottom: spacing.lg, opacity: 0.9 },
  heroActions: { gap: spacing.sm, marginBottom: spacing.lg },
  heroPrimaryBtn: { marginBottom: spacing.xs },
  heroSecondaryBtn: {},
  trust: { gap: spacing.xs },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trustText: { ...typography.bodySmall },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: { ...typography.h2, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  featureTitle: { ...typography.label, flex: 1 },
  stepCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  stepNumber: { ...typography.caption, fontWeight: '700', marginBottom: spacing.xs },
  stepTitle: { ...typography.label, marginBottom: spacing.xs },
  stepDesc: { ...typography.bodySmall },
  statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: '28%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statNumber: { ...typography.h3, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: spacing.xs, textAlign: 'center' },
  statsLoader: { padding: spacing.lg },
  ctaBlock: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ctaTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.xs },
  ctaSubtitle: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.md },
  ctaButton: {},
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  footerLink: { ...typography.bodySmall, marginBottom: spacing.xs },
  footerCopyright: { ...typography.caption },
});
