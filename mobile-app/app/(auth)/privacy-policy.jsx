/**
 * Privacy Policy Screen (React Native)
 * Read-only, scrollable legal content. Ported from frontend PrivacyPolicy.jsx.
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

const SECTIONS = [
  { titleKey: 'legal.privacy.introTitle', bodyKey: 'legal.privacy.introBody' },
  { titleKey: 'legal.privacy.dataTitle', bodyKey: 'legal.privacy.dataBody' },
  { titleKey: 'legal.privacy.useTitle', bodyKey: 'legal.privacy.useBody' },
  { titleKey: 'legal.privacy.securityTitle', bodyKey: 'legal.privacy.securityBody' },
  { titleKey: 'legal.privacy.thirdPartyTitle', bodyKey: 'legal.privacy.thirdPartyBody' },
  { titleKey: 'legal.privacy.cookiesTitle', bodyKey: 'legal.privacy.cookiesBody' },
  { titleKey: 'legal.privacy.contactTitle', bodyKey: 'legal.privacy.contactBody' },
];

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.colors.text} />
          <Text style={[styles.backText, { color: theme.colors.text }]}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{t('legal.privacyPolicy')}</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {t('legal.termsLastUpdated', 'Last Updated: December 15, 2025')}
        </Text>

        {SECTIONS.map(({ titleKey, bodyKey }, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {i + 1}. {t(titleKey)}
            </Text>
            <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>
              {t(bodyKey)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs },
  backText: { ...typography.body, marginLeft: spacing.xs },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  pageTitle: { ...typography.h1, marginBottom: spacing.xs },
  date: { ...typography.caption, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  sectionBody: { ...typography.body, lineHeight: 22 },
});
