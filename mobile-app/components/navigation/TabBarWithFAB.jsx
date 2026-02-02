/**
 * TabBarWithFAB Component
 * 
 * Custom bottom tab bar with a prominent Floating Action Button (FAB) in the center.
 * Features glassmorphism styling, smooth animations, and accessibility support.
 * Follows the Paire "Harmonious Minimalist" design system.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, colors } from '../../constants/theme';
import QuickAddSheet from './QuickAddSheet';

// Animated components
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Tab bar constants - compact design
const TAB_BAR_HEIGHT = 40;
const FAB_SIZE = 54;
const FAB_OFFSET = 26; // How much FAB overlaps above tab bar

/**
 * Individual tab button with animation
 */
function TabButton({ route, label, renderIcon, isFocused, onPress, theme }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 1 : 0.6);

  // Update opacity when focus changes
  React.useEffect(() => {
    opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Active indicator style
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
    transform: [
      { scaleX: withTiming(isFocused ? 1 : 0.5, { duration: 150 }) },
    ],
  }));

  // Get the icon color based on focus state
  const iconColor = isFocused ? theme.colors.primary : theme.colors.textLight;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {/* Render the icon using the provided render function */}
        {renderIcon && renderIcon({ color: iconColor, focused: isFocused })}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.colors.primary : theme.colors.textLight,
              fontWeight: isFocused ? '600' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>

      {/* Active indicator dot */}
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: theme.colors.primary },
          indicatorStyle,
        ]}
      />
    </TouchableOpacity>
  );
}

/**
 * Floating Action Button with rotation animation
 */
function FABButton({ onPress, isOpen, theme }) {
  const { t } = useTranslation();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  // Rotate when sheet opens/closes - clean animation
  React.useEffect(() => {
    rotation.value = withTiming(isOpen ? 45 : 0, { duration: 200 });
  }, [isOpen]);

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.fabContainer}>
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.fabButton, containerAnimatedStyle]}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={t('common.fabLabel', 'Add new transaction')}
        accessibilityHint={t('common.fabHint', 'Opens quick add menu')}
      >
        {/* Gradient background effect */}
        <View style={styles.fabGradient}>
          <Animated.View style={animatedStyle}>
            <Plus size={28} color="#fff" strokeWidth={2.5} />
          </Animated.View>
        </View>
      </AnimatedTouchable>

      {/* Glow effect */}
      <View style={styles.fabGlow} />
    </View>
  );
}

/**
 * Main TabBarWithFAB component
 */
export default function TabBarWithFAB({ state, descriptors, navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Handle FAB press
  const handleFABPress = useCallback(() => {
    setIsQuickAddOpen(true);
  }, []);

  // Handle quick add sheet close
  const handleQuickAddClose = useCallback(() => {
    setIsQuickAddOpen(false);
  }, []);

  // Filter out hidden routes and get visible tabs
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  // Split routes for left and right of FAB
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2, 4);

  // Dynamic styles based on theme
  const tabBarStyle = {
    backgroundColor: theme.dark
      ? 'rgba(15, 7, 26, 0.92)'
      : 'rgba(255, 255, 255, 0.95)',
    borderTopColor: theme.dark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)',
    paddingBottom: insets.bottom,
    height: TAB_BAR_HEIGHT + insets.bottom,
  };

  return (
    <>
      {/* Tab bar container */}
      <View style={[styles.container, tabBarStyle]}>
        {/* Left tabs */}
        <View style={styles.tabGroup}>
          {leftRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.indexOf(route);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabButton
                key={route.key}
                route={route}
                label={options.title || route.name}
                renderIcon={options.tabBarIcon}
                isFocused={isFocused}
                onPress={onPress}
                theme={theme}
              />
            );
          })}
        </View>

        {/* FAB spacer */}
        <View style={styles.fabSpacer} />

        {/* Right tabs */}
        <View style={styles.tabGroup}>
          {rightRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.indexOf(route);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabButton
                key={route.key}
                route={route}
                label={options.title || route.name}
                renderIcon={options.tabBarIcon}
                isFocused={isFocused}
                onPress={onPress}
                theme={theme}
              />
            );
          })}
        </View>

        {/* Floating Action Button */}
        <FABButton
          onPress={handleFABPress}
          isOpen={isQuickAddOpen}
          theme={theme}
        />
      </View>

      {/* Quick Add Sheet */}
      <QuickAddSheet isOpen={isQuickAddOpen} onClose={handleQuickAddClose} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    // Glassmorphism shadow
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4, // Increased from 2 for better spacing
  },
  tabLabel: {
    fontSize: 11, // Slightly larger for better readability
    letterSpacing: -0.2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -spacing.xs,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  fabSpacer: {
    width: FAB_SIZE + spacing.lg, // Increased spacing around FAB
  },
  fabContainer: {
    position: 'absolute',
    top: -FAB_OFFSET,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    alignItems: 'center',
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: FAB_SIZE / 2,
  },
  fabGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: (FAB_SIZE + 16) / 2,
    backgroundColor: colors.primary,
    opacity: 0.12,
    zIndex: -1,
  },
});
