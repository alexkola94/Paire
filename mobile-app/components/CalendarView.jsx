/**
 * CalendarView Component
 * 
 * Monthly calendar grid for viewing transactions by date.
 * Features:
 * - Monthly calendar grid layout
 * - Dots/indicators for days with transactions
 * - Color coding: green for income, red for expense, purple for both
 * - Tap day to filter/select
 * - Swipe to change months
 * - Theme-aware styling with animations
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 6) / 7);

// Weekday labels
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Get all days in a month
 */
function getDaysInMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();
  
  const days = [];
  
  // Add empty slots for days before the 1st
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return days;
}

/**
 * Format date key for transaction lookup
 */
function formatDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Group transactions by date
 */
function groupTransactionsByDate(transactions = []) {
  const grouped = {};
  
  for (const tx of transactions) {
    if (!tx.date) continue;
    const dateKey = tx.date.split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = { income: 0, expense: 0, transactions: [] };
    }
    grouped[dateKey].transactions.push(tx);
    if (tx.type === 'income') {
      grouped[dateKey].income += parseFloat(tx.amount) || 0;
    } else {
      grouped[dateKey].expense += parseFloat(tx.amount) || 0;
    }
  }
  
  return grouped;
}

/**
 * Single calendar day cell
 */
function DayCell({ day, dateKey, data, isSelected, isToday, onSelect, theme }) {
  if (!day) {
    return <View style={styles.dayEmpty} />;
  }
  
  const hasIncome = data?.income > 0;
  const hasExpense = data?.expense > 0;
  const transactionCount = data?.transactions?.length || 0;
  
  // Determine dot color
  let dotColor = null;
  if (hasIncome && hasExpense) {
    dotColor = theme.colors.primary; // Purple for both
  } else if (hasIncome) {
    dotColor = theme.colors.success; // Green for income
  } else if (hasExpense) {
    dotColor = theme.colors.error; // Red for expense
  }
  
  return (
    <TouchableOpacity
      style={[
        styles.day,
        isSelected && { backgroundColor: theme.colors.primary },
        isToday && !isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
      ]}
      onPress={() => onSelect(dateKey)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayText,
          { color: isSelected ? '#fff' : theme.colors.text },
          isToday && !isSelected && { color: theme.colors.primary, fontWeight: '700' },
        ]}
      >
        {day}
      </Text>
      
      {/* Transaction indicator dot */}
      {dotColor && (
        <View style={styles.dotContainer}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          {transactionCount > 1 && (
            <Text style={[styles.dotCount, { color: isSelected ? '#fff' : theme.colors.textLight }]}>
              {transactionCount}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CalendarView({
  transactions = [],
  selectedDate,
  onSelectDate,
  onMonthChange,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Current displayed month
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState({
    year: selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear(),
    month: selectedDate ? new Date(selectedDate).getMonth() : today.getMonth(),
  });
  
  // Animation direction for month change
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right
  
  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    return groupTransactionsByDate(transactions);
  }, [transactions]);
  
  // Get days for the current month
  const days = useMemo(() => {
    return getDaysInMonth(displayMonth.year, displayMonth.month);
  }, [displayMonth.year, displayMonth.month]);
  
  // Today's date key
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    setDirection(-1);
    setDisplayMonth((prev) => {
      const newMonth = prev.month === 0 ? 11 : prev.month - 1;
      const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
      onMonthChange?.({ year: newYear, month: newMonth });
      return { year: newYear, month: newMonth };
    });
  }, [onMonthChange]);
  
  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setDirection(1);
    setDisplayMonth((prev) => {
      const newMonth = prev.month === 11 ? 0 : prev.month + 1;
      const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
      onMonthChange?.({ year: newYear, month: newMonth });
      return { year: newYear, month: newMonth };
    });
  }, [onMonthChange]);
  
  // Handle day selection
  const handleDaySelect = useCallback((dateKey) => {
    onSelectDate?.(dateKey);
  }, [onSelectDate]);
  
  // Month name
  const monthKey = `calendar.months.${['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][displayMonth.month]}`;
  const monthName = t(monthKey);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
          {monthName} {displayMonth.year}
        </Text>
        
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.navBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Weekday Headers */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekday}>
            <Text style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
              {t(`calendar.weekdays.${day}`, day.toUpperCase())}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar Grid */}
      <Animated.View
        key={`${displayMonth.year}-${displayMonth.month}`}
        entering={direction >= 0 ? SlideInRight.duration(200) : SlideInLeft.duration(200)}
        style={styles.grid}
      >
        {days.map((day, index) => {
          const dateKey = day ? formatDateKey(displayMonth.year, displayMonth.month, day) : null;
          const data = dateKey ? transactionsByDate[dateKey] : null;
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;
          
          return (
            <DayCell
              key={index}
              day={day}
              dateKey={dateKey}
              data={data}
              isSelected={isSelected}
              isToday={isToday}
              onSelect={handleDaySelect}
              theme={theme}
            />
          );
        })}
      </Animated.View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            {t('common.income', 'Income')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            {t('common.expense', 'Expense')}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            {t('common.both', 'Both')}
          </Text>
        </View>
      </View>
      
      {/* Hint */}
      <Text style={[styles.hint, { color: theme.colors.textLight }]}>
        {t('calendar.tapDayToFilter', 'Tap a day to see transactions')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    width: DAY_SIZE,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  dayEmpty: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    marginBottom: spacing.xs,
  },
  dayText: {
    ...typography.body,
    fontWeight: '500',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCount: {
    fontSize: 8,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
