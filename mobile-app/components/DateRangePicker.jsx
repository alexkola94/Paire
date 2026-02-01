/**
 * DateRangePicker Component (React Native)
 * Reusable start/end date range picker; theme-aware and responsive.
 * Used for transaction filters and any screen needing a date range.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

/**
 * Format YYYY-MM-DD for display (short locale date)
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function DateRangePicker({
  startDate = '',
  endDate = '',
  onStartDateChange,
  onEndDateChange,
  label,
  minDate,
  maxDate = new Date(),
  showQuickPresets = true,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const startDateObj = useMemo(() => {
    if (!startDate) return new Date();
    const parts = String(startDate).split('T')[0].split('-');
    if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return new Date(startDate);
  }, [startDate]);

  const endDateObj = useMemo(() => {
    if (!endDate) return new Date();
    const parts = String(endDate).split('T')[0].split('-');
    if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return new Date(endDate);
  }, [endDate]);

  const toYYYYMMDD = (date) => date.toISOString().split('T')[0];

  const handleStartChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (event.type === 'dismissed') {
      setShowStartPicker(false);
      return;
    }
    if (selectedDate) {
      const str = toYYYYMMDD(selectedDate);
      onStartDateChange?.(str);
      if (endDate && str > endDate) onEndDateChange?.(str);
    }
  };

  const handleEndChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'dismissed') {
      setShowEndPicker(false);
      return;
    }
    if (selectedDate) onEndDateChange?.(toYYYYMMDD(selectedDate));
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    onStartDateChange?.(toYYYYMMDD(start));
    onEndDateChange?.(toYYYYMMDD(end));
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    onStartDateChange?.(toYYYYMMDD(start));
    onEndDateChange?.(toYYYYMMDD(now));
  };

  const clearRange = () => {
    onStartDateChange?.('');
    onEndDateChange?.('');
  };

  const minDateObj = minDate ? new Date(minDate) : undefined;
  const maxDateObj = maxDate instanceof Date ? maxDate : maxDate ? new Date(maxDate) : new Date();

  const dynamicStyles = {
    label: { color: theme.colors.text },
    trigger: { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder },
    triggerText: { color: theme.colors.text },
    triggerPlaceholder: { color: theme.colors.textLight },
    presetBtn: { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder },
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.trigger, dynamicStyles.trigger]}
          onPress={() => setShowStartPicker(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('transactions.startDate', 'From')}
          accessibilityRole="button"
        >
          <Calendar size={18} color={theme.colors.primary} style={styles.icon} />
          <Text
            style={[
              styles.triggerText,
              dynamicStyles.triggerText,
              !startDate && dynamicStyles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {formatDisplayDate(startDate) || t('transactions.startDate', 'From')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.sep, { color: theme.colors.textSecondary }]}>–</Text>
        <TouchableOpacity
          style={[styles.trigger, dynamicStyles.trigger]}
          onPress={() => setShowEndPicker(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('transactions.endDate', 'To')}
          accessibilityRole="button"
        >
          <Calendar size={18} color={theme.colors.primary} style={styles.icon} />
          <Text
            style={[
              styles.triggerText,
              dynamicStyles.triggerText,
              !endDate && dynamicStyles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {formatDisplayDate(endDate) || t('transactions.endDate', 'To')}
          </Text>
        </TouchableOpacity>
      </View>

      {showQuickPresets && (
        <View style={styles.presets}>
          <TouchableOpacity
            style={[styles.presetBtn, dynamicStyles.presetBtn]}
            onPress={setLast7Days}
            activeOpacity={0.7}
          >
            <Text style={[styles.presetText, { color: theme.colors.textSecondary }]}>
              {t('transactions.presetLast7', 'Last 7 days')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, dynamicStyles.presetBtn]}
            onPress={setThisMonth}
            activeOpacity={0.7}
          >
            <Text style={[styles.presetText, { color: theme.colors.textSecondary }]}>
              {t('transactions.presetThisMonth', 'This month')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, dynamicStyles.presetBtn]}
            onPress={clearRange}
            activeOpacity={0.7}
          >
            <Text style={[styles.presetText, { color: theme.colors.textSecondary }]}>
              {t('common.clear', 'Clear')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showStartPicker && (
        Platform.OS === 'ios' ? (
          <View style={styles.iosOverlay}>
            <View style={[styles.iosPickerBox, { backgroundColor: theme.colors.surface }]}>
              <DateTimePicker
                value={startDateObj}
                mode="date"
                display="spinner"
                onChange={handleStartChange}
                minimumDate={minDateObj}
                maximumDate={maxDateObj}
              />
              <TouchableOpacity
                style={[styles.iosDoneBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={styles.iosDoneText}>{t('common.done', 'Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={startDateObj}
            mode="date"
            display="default"
            onChange={handleStartChange}
            minimumDate={minDateObj}
            maximumDate={maxDateObj}
          />
        )
      )}

      {showEndPicker && (
        Platform.OS === 'ios' ? (
          <View style={styles.iosOverlay}>
            <View style={[styles.iosPickerBox, { backgroundColor: theme.colors.surface }]}>
              <DateTimePicker
                value={endDateObj}
                mode="date"
                display="spinner"
                onChange={handleEndChange}
                minimumDate={startDate ? startDateObj : minDateObj}
                maximumDate={maxDateObj}
              />
              <TouchableOpacity
                style={[styles.iosDoneBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={styles.iosDoneText}>{t('common.done', 'Done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={endDateObj}
            mode="date"
            display="default"
            onChange={handleEndChange}
            minimumDate={startDate ? startDateObj : minDateObj}
            maximumDate={maxDateObj}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  label: { ...typography.label, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  icon: { marginRight: spacing.sm },
  triggerText: { ...typography.bodySmall, flex: 1 },
  sep: { ...typography.bodySmall, fontWeight: '600' },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  presetText: { ...typography.caption, fontWeight: '500' },
  iosOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  iosPickerBox: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
  },
  iosDoneBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  iosDoneText: { color: '#fff', ...typography.label },
});
