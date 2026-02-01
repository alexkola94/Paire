/**
 * SearchInput Component (React Native)
 * Ported from frontend/src/components/SearchInput.jsx
 * 
 * Features:
 * - Built-in debounce for search optimization
 * - Clear button
 * - Animated focus state
 * - Theme-aware glassmorphism style
 * - Accessibility support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function SearchInput({
  onSearch,
  placeholder,
  debounceMs = 500,
  initialValue = '',
  style,
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Update local value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Animate focus state
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  /**
   * Handle text change with debounce
   */
  const handleChange = useCallback((newValue) => {
    setValue(newValue);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If value is empty, search immediately to restore list
    if (newValue.trim() === '') {
      onSearch?.('');
      return;
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      onSearch?.(newValue);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  /**
   * Handle clear button press
   */
  const handleClear = useCallback(() => {
    setValue('');
    onSearch?.('');
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [onSearch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Animated border color
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.glassBorder, theme.colors.primary],
  });

  // Dynamic styles
  const dynamicStyles = {
    container: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    input: {
      color: theme.colors.text,
    },
    placeholder: theme.colors.textLight,
    icon: theme.colors.textSecondary,
    iconFocused: theme.colors.primary,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        dynamicStyles.container,
        { borderColor },
        style,
      ]}
    >
      {/* Search Icon */}
      <Search
        size={20}
        color={isFocused ? dynamicStyles.iconFocused : dynamicStyles.icon}
        style={styles.searchIcon}
      />

      {/* Text Input */}
      <TextInput
        style={[styles.input, dynamicStyles.input]}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || t('common.search', 'Search...')}
        placeholderTextColor={dynamicStyles.placeholder}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t('common.search', 'Search')}
      />

      {/* Clear Button */}
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearBtn}
          activeOpacity={0.7}
          accessibilityLabel={t('common.clear', 'Clear')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={dynamicStyles.icon} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm + 2,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
