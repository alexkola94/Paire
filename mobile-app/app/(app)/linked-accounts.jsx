/**
 * Linked Accounts Screen (React Native)
 * Shows connected bank accounts and "Connect bank" entry point.
 * Bank linking (Plaid) flow can open in WebView or web app; callback uses bank-callback route.
 * Theme-aware, responsive, with smooth transitions.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, CreditCard } from 'lucide-react-native';
import { openBankingService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Button, useToast } from '../../components';
// Optional: use Linking.openURL(webAppUrl) to open web app bank connect page

export default function LinkedAccountsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading, error } = useQuery({
    queryKey: ['open-banking-accounts'],
    queryFn: () => openBankingService.getAccounts(),
    retry: false,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const list = Array.isArray(data) ? data : data?.accounts ?? [];

  const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;

  const handleConnectBank = () => {
    if (webAppUrl) {
      Linking.openURL(webAppUrl).catch(() => {
        showToast(t('profile.openBanking.mobileHint', 'To connect your bank, use the Paire web app on desktop.'), 'info');
      });
    } else {
      showToast(t('profile.openBanking.mobileHint', 'To connect your bank, use the Paire web app or open this link on desktop.'), 'info');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('profile.openBanking.title', 'Linked accounts')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {isLoading && list.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.card, styles.cardTransition, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {error?.response?.status === 404
                ? t('profile.openBanking.noAccounts', 'No linked accounts yet.')
                : t('profile.openBanking.loadError', 'Could not load accounts.')}
            </Text>
          </View>
        ) : null}

        {/* Empty state: no accounts and no error (successful empty response) */}
        {!isLoading && !error && list.length === 0 && (
          <View style={[styles.emptyCard, styles.cardTransition, { backgroundColor: theme.colors.surface + 'E6', borderColor: theme.colors.glassBorder }]}>
            <CreditCard size={40} color={theme.colors.textLight} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {t('profile.openBanking.noAccounts', 'No linked accounts yet.')}
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              {t('profile.openBanking.connectDescription', 'Connect your bank account to automatically import transactions.')}
            </Text>
          </View>
        )}

        {list.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('profile.openBanking.connectedAccounts', 'Connected Accounts')}
            </Text>
            {list.map((acc, index) => (
              <View
                key={acc.id || acc.accountId || acc.name || index}
                style={[styles.card, styles.cardTransition, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
              >
                <CreditCard size={22} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.accountName, { color: theme.colors.text }]} numberOfLines={1}>
                    {acc.name || acc.institutionName || acc.mask || 'Account'}
                  </Text>
                  <Text style={[styles.accountSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {acc.mask ? `•••• ${acc.mask}` : acc.type || ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t('profile.openBanking.connectNew', 'Connect a bank')}
        </Text>
        <View style={[styles.card, styles.cardTransition, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {t('profile.openBanking.mobileHint', 'To connect your bank, use the Paire web app. Your linked accounts will sync here.')}
          </Text>
          <Button
            title={t('profile.openBanking.connectBank', 'Connect bank')}
            onPress={handleConnectBank}
          />
        </View>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { flex: 1, ...typography.h3 },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  centered: { padding: spacing.xl },
  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  message: { ...typography.body },
  accountName: { ...typography.body, fontWeight: '600' },
  accountSub: { ...typography.bodySmall, marginTop: 2 },
  hint: { ...typography.bodySmall, marginBottom: spacing.md },
  // Empty state and transitions (theme-aware, smooth)
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  emptyTitle: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
  emptySub: { ...typography.bodySmall, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.md },
  cardTransition: {
    opacity: 1,
    // Smooth transition via React Native's default; use Animated if needed for mount/unmount
  },
});
