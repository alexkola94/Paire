import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

export default function YearReviewCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const previousYear = new Date().getFullYear() - 1;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={() => router.push('/(app)/year-in-review')}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
          <Calendar size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('yearReview.title', 'Year in Review')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('yearReview.ready', `Your ${previousYear} Wrapped is ready!`, { year: previousYear })}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
});
