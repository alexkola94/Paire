/**
 * DateInput Component (React Native)
 * Ported from frontend/src/components/DateInput.jsx
 * 
 * Features:
 * - Date picker trigger with formatted display
 * - Quick date selection buttons (Today, Yesterday, This Week)
 * - Theme-aware styling
 * - Accessibility support
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
import { Calendar, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

/**
 * Check if two dates are the same day
 */
const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Check if date is within the current week (Monday to Sunday)
 */
const isThisWeek = (date) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay();
  // Adjust to Monday as start of week
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(now.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
};

export default function DateInput({
  value = '',
  onChange,
  name = 'date',
  label,
  required = false,
  disabled = false,
  showQuickButtons = true,
  placeholder,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse the value string to Date object
  const dateValue = useMemo(() => {
    if (!value) return new Date();
    try {
      // Parse YYYY-MM-DD format
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(value);
    } catch {
      return new Date();
    }
  }, [value]);

  /**
   * Format date for display
   */
  const formatDisplayDate = (dateString) => {
    if (!dateString) return placeholder || t('transaction.selectDate', 'Select date');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  /**
   * Get yesterday's date in YYYY-MM-DD format
   */
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  /**
   * Handle date selection from picker
   */
  const handleDateChange = (event, selectedDate) => {
    // On Android, picker dismisses after selection
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onChange?.({ target: { name, value: dateString } });
    }
    
    // On iOS, we keep the picker open until manually dismissed
    if (Platform.OS === 'ios' && event.type === 'set') {
      // User confirmed selection on iOS
    }
  };

  /**
   * Handle quick date button press
   */
  const handleQuickDate = (dateString) => {
    onChange?.({ target: { name, value: dateString } });
  };

  /**
   * Check if current value is today
   */
  const isToday = value && isSameDay(new Date(value), new Date());

  /**
   * Check if current value is yesterday
   */
  const isYesterday = () => {
    if (!value) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(new Date(value), yesterday);
  };

  /**
   * Check if current value is this week
   */
  const isThisWeekValue = value && isThisWeek(new Date(value));

  // Dynamic styles based on theme
  const dynamicStyles = {
    inputContainer: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    inputText: {
      color: value ? theme.colors.text : theme.colors.textLight,
    },
    label: {
      color: theme.colors.text,
    },
    quickBtn: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    quickBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    quickBtnText: {
      color: theme.colors.textSecondary,
    },
    quickBtnTextActive: {
      color: '#ffffff',
    },
  };

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, dynamicStyles.label]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Date Input Trigger */}
      <TouchableOpacity
        style={[styles.inputContainer, dynamicStyles.inputContainer]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={label || t('transaction.date')}
        accessibilityRole="button"
      >
        <Calendar size={20} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.inputText, dynamicStyles.inputText]} numberOfLines={1}>
          {formatDisplayDate(value)}
        </Text>
        <ChevronDown size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Quick Date Buttons */}
      {showQuickButtons && !disabled && (
        <View style={styles.quickDates}>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              dynamicStyles.quickBtn,
              isToday && dynamicStyles.quickBtnActive,
            ]}
            onPress={() => handleQuickDate(getToday())}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickBtnText,
                dynamicStyles.quickBtnText,
                isToday && dynamicStyles.quickBtnTextActive,
              ]}
            >
              {t('transaction.quickDate.today', 'Today')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickBtn,
              dynamicStyles.quickBtn,
              isYesterday() && dynamicStyles.quickBtnActive,
            ]}
            onPress={() => handleQuickDate(getYesterday())}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickBtnText,
                dynamicStyles.quickBtnText,
                isYesterday() && dynamicStyles.quickBtnTextActive,
              ]}
            >
              {t('transaction.quickDate.yesterday', 'Yesterday')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickBtn,
              dynamicStyles.quickBtn,
              isThisWeekValue && !isToday && !isYesterday() && dynamicStyles.quickBtnActive,
            ]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickBtnText,
                dynamicStyles.quickBtnText,
                isThisWeekValue && !isToday && !isYesterday() && dynamicStyles.quickBtnTextActive,
              ]}
            >
              {t('transaction.quickDate.thisWeek', 'This Week')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker Modal */}
      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()} // Don't allow future dates by default
        />
      )}

      {/* iOS: Add Done button to dismiss picker */}
      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerOverlay}>
          <View style={[styles.iosPickerContainer, { backgroundColor: theme.colors.surface }]}>
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              style={styles.iosPicker}
            />
            <TouchableOpacity
              style={[styles.iosDoneBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.iosDoneBtnText}>{t('common.done', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  required: {
    color: '#e74c3c',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 52,
  },
  icon: {
    marginRight: spacing.sm,
  },
  inputText: {
    flex: 1,
    ...typography.body,
  },
  quickDates: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  quickBtnText: {
    ...typography.caption,
    fontWeight: '500',
  },
  // iOS Picker Modal styles
  iosPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  iosPickerContainer: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
  },
  iosPicker: {
    height: 200,
  },
  iosDoneBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  iosDoneBtnText: {
    color: '#ffffff',
    ...typography.label,
  },
});
