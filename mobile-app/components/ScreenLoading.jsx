/**
 * ScreenLoading
 * Reusable full-screen loading view: centered ActivityIndicator + optional message.
 * Used to gate first-load so users see loading instead of empty state until data is ready.
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../constants/theme';

export default function ScreenLoading({ message }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const displayMessage = message ?? t('common.loading', 'Loading...');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{displayMessage}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  message: {
    ...typography.body,
  },
});
