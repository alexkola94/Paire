/**
 * Economic News Screen (React Native)
 * Displays Greece economic data (CPI, food prices, indicators, news).
 * Uses economicService from api; shows Under Construction if backend data is not ready.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw, AlertCircle, Info, Construction } from 'lucide-react-native';
import { economicService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { ScreenHeader } from '../../components';

export default function EconomicNewsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading, isError, error } = useQuery({
    queryKey: ['economic-data'],
    queryFn: () => economicService.getAll(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const hasData = data && !data.error;
  const showUnderConstruction = isLoading === false && (isError || !hasData);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('economicNews.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showUnderConstruction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('economicNews.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('economicNews.subtitle')}</Text>
          <View style={[styles.underConstruction, { backgroundColor: theme.colors.surface }, shadows.md]}>
            <Construction size={48} color={theme.colors.primary} style={styles.constructionIcon} />
            <Text style={[styles.ucTitle, { color: theme.colors.text }]}>{t('economicNews.underConstruction.title')}</Text>
            <Text style={[styles.ucMessage, { color: theme.colors.textSecondary }]}>{t('economicNews.underConstruction.message')}</Text>
            <Text style={[styles.ucInfo, { color: theme.colors.textLight }]}>{t('economicNews.underConstruction.info')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cpi = data?.cpi;
  const foodPrices = data?.foodPrices;
  const indicators = data?.indicators;
  const news = data?.news;

  // API may return metrics as objects { value, unit, change, changePercent, period, error }; render value/unit only
  const formatMetric = (v) => {
    if (v == null) return null;
    if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
      const val = v.value != null ? String(v.value) : '';
      const unit = v.unit ? ` ${v.unit}` : '';
      return val !== '' ? `${val}${unit}`.trim() : null;
    }
    return String(v);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('economicNews.title')}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <RefreshCw size={18} color={theme.colors.primary} />
            <Text style={[styles.refreshText, { color: theme.colors.primary }]}>{t('economicNews.refresh')}</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('economicNews.subtitle')}</Text>
        {cpi && !cpi.error && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('economicNews.cpi.title')}</Text>
            </View>
            <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
              {(() => {
                const rateStr = formatMetric(cpi.currentRate);
                return rateStr != null ? (rateStr.endsWith('%') ? rateStr : `${rateStr}%`) : t('economicNews.unknown');
              })()}
            </Text>
            {cpi.lastUpdated && (
              <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>
                {t('economicNews.lastUpdated')} {new Date(cpi.lastUpdated).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {foodPrices && !foodPrices.error && (foodPrices.categories?.length > 0 || foodPrices.average != null) && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('economicNews.foodPrices.title')}</Text>
            </View>
            {(foodPrices.average != null || (typeof foodPrices.average === 'object' && foodPrices.average?.value != null)) && (
              <Text style={[styles.sectionValue, { color: theme.colors.text }]}>
                {t('economicNews.foodPrices.average')}: €{typeof foodPrices.average === 'object' && foodPrices.average?.value != null
                  ? Number(foodPrices.average.value).toFixed(2)
                  : Number(foodPrices.average).toFixed(2)}
              </Text>
            )}
            {foodPrices.lastUpdated && (
              <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>
                {t('economicNews.lastUpdated')} {new Date(foodPrices.lastUpdated).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {indicators && !indicators.error && Object.keys(indicators).filter((k) => k !== 'error' && k !== 'lastUpdated').length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('economicNews.indicators.title')}</Text>
            </View>
            {indicators.gdp != null && formatMetric(indicators.gdp) != null && (
              <Text style={[styles.sectionRow, { color: theme.colors.text }]}>{t('economicNews.indicators.gdp')}: {formatMetric(indicators.gdp)}</Text>
            )}
            {indicators.unemployment != null && formatMetric(indicators.unemployment) != null && (
              <Text style={[styles.sectionRow, { color: theme.colors.text }]}>{t('economicNews.indicators.unemployment')}: {formatMetric(indicators.unemployment)}</Text>
            )}
            {indicators.inflation != null && formatMetric(indicators.inflation) != null && (
              <Text style={[styles.sectionRow, { color: theme.colors.text }]}>{t('economicNews.indicators.inflation')}: {formatMetric(indicators.inflation)}</Text>
            )}
            {indicators.lastUpdated && (
              <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>
                {t('economicNews.lastUpdated')} {new Date(indicators.lastUpdated).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {news && !news.error && news.articles?.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <View style={styles.sectionHeader}>
              <Info size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('economicNews.news.title')}</Text>
            </View>
            {news.articles.slice(0, 5).map((article, idx) => (
              <View key={idx} style={styles.newsItem}>
                <Text style={[styles.newsTitle, { color: theme.colors.text }]} numberOfLines={2}>{article.title || article.headline}</Text>
                {article.source && (
                  <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>{t('economicNews.source')}: {article.source}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {data && !cpi && !foodPrices && !indicators && (!news || !news.articles?.length) && (
          <View style={[styles.underConstruction, { backgroundColor: theme.colors.surface }, shadows.md]}>
            <AlertCircle size={40} color={theme.colors.textLight} />
            <Text style={[styles.ucMessage, { color: theme.colors.textSecondary }]}>{t('economicNews.error.loading')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { ...typography.body },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  refreshText: { ...typography.label },
  section: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3 },
  sectionValue: { ...typography.body, marginBottom: spacing.xs },
  sectionRow: { ...typography.body, marginBottom: spacing.xs },
  sectionMeta: { ...typography.bodySmall, marginTop: spacing.xs },
  newsItem: { marginBottom: spacing.md },
  newsTitle: { ...typography.body, fontWeight: '500' },
  underConstruction: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  constructionIcon: { marginBottom: spacing.md },
  ucTitle: { ...typography.h3, marginBottom: spacing.sm, textAlign: 'center' },
  ucMessage: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  ucInfo: { ...typography.bodySmall, textAlign: 'center' },
});
