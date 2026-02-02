/**
 * FormSection Component (React Native)
 * Ported from frontend/src/components/FormSection.jsx
 * 
 * Features:
 * - Groups related form fields
 * - Optional collapsible sections with animation
 * - Visual separators
 * - Theme-aware styling
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FormSection({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  style,
}) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Animate chevron rotation when expanded state changes
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  /**
   * Toggle expanded state with animation
   */
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Rotation interpolation for chevron
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.glassBorder,
    },
    header: {
      borderBottomColor: isExpanded ? theme.colors.glassBorder : 'transparent',
    },
    title: {
      color: theme.colors.text,
    },
    chevron: {
      color: theme.colors.textSecondary,
    },
  };

  // Simple wrapper without title (not collapsible)
  if (!title && !collapsible) {
    return (
      <View style={[styles.simpleWrapper, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container, style]}>
      {/* Header */}
      {title && (
        <TouchableOpacity
          style={[
            styles.header,
            dynamicStyles.header,
            !collapsible && styles.headerNonCollapsible,
          ]}
          onPress={collapsible ? toggleExpanded : undefined}
          disabled={!collapsible}
          activeOpacity={collapsible ? 0.7 : 1}
          accessibilityRole={collapsible ? 'button' : undefined}
          accessibilityState={collapsible ? { expanded: isExpanded } : undefined}
        >
          <Text style={[styles.title, dynamicStyles.title]}>
            {title}
          </Text>
          {collapsible && (
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </Animated.View>
          )}
        </TouchableOpacity>
      )}

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  simpleWrapper: {
    marginBottom: spacing.sm,
  },
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm, // Reduced from spacing.md for compact layout
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm, // Reduced from spacing.md
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerNonCollapsible: {
    borderBottomWidth: 1,
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  content: {
    padding: spacing.sm, // Reduced from spacing.md for compact layout
  },
});
