/**
 * Currency Calculator Screen (React Native)
 * Converts between currencies using currencyService.
 * Amount input, from/to dropdowns, swap, convert, result and popular rates.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, Info, TrendingUp } from 'lucide-react-native';
import { currencyService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Dropdown, Button, ScreenHeader } from '../../components';

export default function CurrencyCalculatorScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  useBackGesture();
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [result, setResult] = useState(null);

  const { data: currencies = {}, isLoading: loadingCurrencies } = useQuery({
    queryKey: ['currency-list'],
    queryFn: () => currencyService.getCurrencies(),
  });

  const { data: popularRates, isLoading: loadingRates } = useQuery({
    queryKey: ['currency-rates', fromCurrency],
    queryFn: () => currencyService.getRates(fromCurrency),
    enabled: !!fromCurrency,
  });

  const convertMutation = useMutation({
    mutationFn: () => {
      const num = parseFloat(String(amount).replace(',', '.'));
      if (isNaN(num) || num <= 0) throw new Error('Invalid amount'); // i18n-ignore: dev/validation
      return currencyService.convert(fromCurrency, toCurrency, num);
    },
    onSuccess: (data) => {
      const value = data && typeof data === 'object' && data.result != null ? data.result : data;
      setResult(Number(value));
    },
  });

  const handleConvert = useCallback(() => {
    const num = parseFloat(String(amount).replace(',', '.'));
    if (!amount || isNaN(num) || num <= 0) return;
    convertMutation.mutate();
  }, [amount, convertMutation]);

  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  }, [fromCurrency, toCurrency]);

  const currencyOptions = Object.entries(currencies).map(([code, name]) => ({
    value: code,
    label: `${code} - ${name || code}`,
  }));

  const fromOptions = currencyOptions;
  const toOptions = currencyOptions;

  const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
  const popularList = popularRates && typeof popularRates === 'object'
    ? Object.entries(popularRates)
        .filter(([code]) => popularCodes.includes(code) && code !== fromCurrency)
        .slice(0, 8)
    : [];

  const numAmount = parseFloat(String(amount).replace(',', '.')) || 0;
  const rate = result != null && numAmount > 0 ? (result / numAmount).toFixed(4) : null;

  if (loadingCurrencies) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('currencyCalculator.loadError')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={t('currencyCalculator.title')} onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('currencyCalculator.subtitle')}</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.md]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('currencyCalculator.amount')}</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00" // i18n-ignore
              placeholderTextColor={theme.colors.textLight}
              keyboardType="decimal-pad"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('currencyCalculator.from')}</Text>
                <Dropdown
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  options={fromOptions}
                  placeholder={t('currencyCalculator.from')}
                />
              </View>
              <TouchableOpacity
                style={[styles.swapBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSwap}
                accessibilityLabel={t('currencyCalculator.swap')}
              >
                <RefreshCw size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.half}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('currencyCalculator.to')}</Text>
                <Dropdown
                  value={toCurrency}
                  onChange={setToCurrency}
                  options={toOptions}
                  placeholder={t('currencyCalculator.to')}
                />
              </View>
            </View>

            <Button
              title={convertMutation.isPending ? t('currencyCalculator.converting') : t('currencyCalculator.convert')}
              onPress={handleConvert}
              disabled={convertMutation.isPending || !amount}
              loading={convertMutation.isPending}
              style={styles.convertBtn}
            />

            {convertMutation.isError && (
              <Text style={[styles.errorText, { color: '#dc2626' }]}>{t('currencyCalculator.error')}</Text>
            )}

            {result != null && (
              <View style={[styles.resultCard, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.resultFrom, { color: theme.colors.textSecondary }]}>
                  {numAmount.toLocaleString()} {currencies[fromCurrency] || fromCurrency} =
                </Text>
                <Text style={[styles.resultTo, { color: theme.colors.text }]}>
                  {Number(result).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
                </Text>
                {rate && (
                  <View style={styles.rateRow}>
                    <Info size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.rateText, { color: theme.colors.textSecondary }]}>
                      {t('currencyCalculator.rateInfo', { from: fromCurrency, rate, to: toCurrency })}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {popularList.length > 0 && (
            <View style={[styles.popularCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <View style={styles.popularHeader}>
                <TrendingUp size={20} color={theme.colors.primary} />
                <Text style={[styles.popularTitle, { color: theme.colors.text }]}>
                  {t('currencyCalculator.popularRates', { currency: fromCurrency })}
                </Text>
              </View>
              <View style={styles.ratesGrid}>
                {popularList.map(([code, rateVal]) => (
                  <View key={code} style={[styles.rateCard, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.rateCode, { color: theme.colors.primary }]}>{code}</Text>
                    <Text style={[styles.rateValue, { color: theme.colors.text }]}>{Number(rateVal).toFixed(4)}</Text>
                    <Text style={[styles.rateName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {currencies[code] || code}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { ...typography.body },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  label: { ...typography.label, marginBottom: spacing.xs },
  amountInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  half: { flex: 1 },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  convertBtn: { marginTop: spacing.sm },
  errorText: { ...typography.bodySmall, marginTop: spacing.md, textAlign: 'center' },
  resultCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  resultFrom: { ...typography.bodySmall, marginBottom: spacing.xs },
  resultTo: { ...typography.h3, marginBottom: spacing.xs },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rateText: { ...typography.bodySmall },
  popularCard: { borderRadius: borderRadius.lg, padding: spacing.lg },
  popularHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  popularTitle: { ...typography.h3 },
  ratesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rateCard: {
    width: '47%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  rateCode: { ...typography.label },
  rateValue: { ...typography.body, fontWeight: '600', marginVertical: spacing.xs },
  rateName: { ...typography.bodySmall },
});
