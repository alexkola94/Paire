/**
 * TabBarWithFAB Component
 *
 * Floating pill tab bar with real glassmorphism (blur + translucent tint) and
 * an opaque rounded "sub-pill" behind the active tab (reference-style).
 * Center slot is an "Add" tab (opens Quick Add sheet); 4 nav tabs (Dashboard, Transactions, Bills, Profile).
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
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import QuickAddSheet from './QuickAddSheet';

// Floating pill (reference-style): radius, padding, insets
const FLOATING_PILL_RADIUS = 28;
const FLOATING_PILL_VERTICAL_PADDING = 8;
const FLOATING_PILL_MARGIN_H = 20;
// Distance from bottom edge; increase to sit bar higher, decrease to sit lower (closer to edge)
const FLOATING_PILL_MARGIN_BOTTOM = -5;
// Active tab sub-pill: rounded background behind selected tab
const ACTIVE_SUB_PILL_PADDING_H = 12;
const ACTIVE_SUB_PILL_PADDING_V = 6;
const ACTIVE_SUB_PILL_RADIUS = 9999;

// Tab bar constants - compact design
const TAB_BAR_HEIGHT = 40;
// Center "Add" tab fixed width (same visual weight as other tabs)
const ADD_TAB_WIDTH = 64;

/**
 * Individual tab button: reference-style active sub-pill (opaque rounded bg behind selected tab)
 */
function TabButton({ route, label, renderIcon, isFocused, onPress, theme }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 1 : 0.7);

  React.useEffect(() => {
    opacity.value = withTiming(isFocused ? 1 : 0.7, { duration: 200 });
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Active tab: primary; inactive: textLight (on glass)
  const iconColor = isFocused ? theme.colors.primary : theme.colors.textLight;
  const labelColor = isFocused ? theme.colors.primary : theme.colors.textLight;

  // Sub-pill background for active tab (reference: opaque rounded pill behind icon + label)
  const activeSubPillBg = theme.dark
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(0, 0, 0, 0.06)';

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
        {/* When focused: wrap in sub-pill (opaque rounded bg) like reference */}
        {isFocused ? (
          <View
            style={[
              styles.activeSubPill,
              {
                backgroundColor: activeSubPillBg,
              },
            ]}
          >
            {renderIcon && renderIcon({ color: iconColor, focused: isFocused })}
            <Text
              style={[
                styles.tabLabel,
                { color: labelColor, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        ) : (
          <>
            {renderIcon && renderIcon({ color: iconColor, focused: isFocused })}
            <Text
              style={[
                styles.tabLabel,
                { color: labelColor, fontWeight: '500' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Center "Add" tab: opens Quick Add sheet. Same pill style as other tabs; shows active sub-pill when sheet is open.
 */
function AddTabButton({ onPress, isOpen, theme }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = isOpen ? theme.colors.primary : theme.colors.textLight;
  const labelColor = isOpen ? theme.colors.primary : theme.colors.textLight;
  const activeSubPillBg = theme.dark
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={styles.addTabContainer}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.fabLabel', 'Add new transaction')}
        accessibilityHint={t('common.fabHint', 'Opens quick add menu')}
      >
        <Animated.View style={[styles.tabContent, animatedStyle]}>
          {isOpen ? (
            <View style={[styles.activeSubPill, { backgroundColor: activeSubPillBg }]}>
              <Plus size={22} color={iconColor} strokeWidth={2.5} />
              <Text
                style={[styles.tabLabel, { color: labelColor, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {t('navigation.add', 'Add')}
              </Text>
            </View>
          ) : (
            <>
              <Plus size={22} color={iconColor} strokeWidth={2} />
              <Text
                style={[styles.tabLabel, { color: labelColor, fontWeight: '500' }]}
                numberOfLines={1}
              >
                {t('navigation.add', 'Add')}
              </Text>
            </>
          )}
        </Animated.View>
      </TouchableOpacity>
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

  // Whether to hide tab bar when active screen requests it (e.g. chatbot full-screen)
  const activeRoute = state.routes[state.index];
  const activeOptions = activeRoute ? descriptors[activeRoute.key]?.options : {};
  const hideTabBar = activeOptions.tabBarStyle?.display === 'none';

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

  // Blur intensity from theme (fallback for older theme objects)
  const blurIntensity = theme.colors.blurIntensity ?? 70;
  const blurTint = theme.dark ? 'dark' : 'light';

  // Outer wrapper: overlay content (Revolut-style) so content scrolls behind the bar
  // Custom tab bar does not receive tabBarStyle from navigator; we apply absolute positioning here
  const isFloatingPill = true;
  const outerWrapperStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: isFloatingPill ? FLOATING_PILL_MARGIN_BOTTOM + insets.bottom : insets.bottom,
    backgroundColor: 'transparent', // Let BlurView show; no solid bar background
  };

  // Inner bar: floating pill on iOS (margins, radius), full-width on Android
  const innerBarHeight = isFloatingPill
    ? TAB_BAR_HEIGHT + FLOATING_PILL_VERTICAL_PADDING * 2
    : TAB_BAR_HEIGHT;
  // Subtle light border around pill (reference: thin light outline)
  const pillBorderColor = theme.dark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.08)';
  const innerBarStyle = {
    height: innerBarHeight,
    borderColor: pillBorderColor,
    backgroundColor: 'transparent', // BlurView provides the glass; no solid fill
    ...(isFloatingPill
      ? {
          marginHorizontal: FLOATING_PILL_MARGIN_H,
          borderRadius: FLOATING_PILL_RADIUS,
          borderWidth: 1,
          overflow: 'hidden',
        }
      : {
          borderTopWidth: 1,
        }),
  };

  // Hide tab bar after all hooks (avoids "Rendered fewer hooks than expected")
  if (hideTabBar) {
    return null;
  }

  return (
    <>
      {/* Outer wrapper: safe area and bottom spacing */}
      <View style={[styles.outerWrapper, outerWrapperStyle]}>
        {/* Inner bar: BlurView + content (pill on iOS, full-width on Android) */}
        <View style={[styles.innerBar, innerBarStyle]}>
          {/* Real glassmorphism: blur content behind the bar (iOS; Android may fall back to semi-transparent) */}
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
          />
          {/* Android: light tint so bar stays translucent when BlurView fallback is used */}
          {Platform.OS === 'android' && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: theme.dark
                    ? 'rgba(15, 7, 26, 0.12)'
                    : 'rgba(255, 255, 255, 0.12)',
                },
              ]}
              pointerEvents="none"
            />
          )}
          {/* Content row: left tabs + Add tab + right tabs */}
          <View style={styles.contentRow}>
            {/* Left tabs */}
            <View style={styles.tabGroup}>
              {leftRoutes.map((route) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === state.routes.indexOf(route);

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.jumpTo(route.name);
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

            {/* Center Add tab: opens Quick Add sheet (no route) */}
            <AddTabButton
              onPress={handleFABPress}
              isOpen={isQuickAddOpen}
              theme={theme}
            />

            {/* Right tabs */}
            <View style={styles.tabGroup}>
              {rightRoutes.map((route) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === state.routes.indexOf(route);

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.jumpTo(route.name);
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
          </View>
        </View>
      </View>

      {/* Quick Add Sheet */}
      <QuickAddSheet isOpen={isQuickAddOpen} onClose={handleQuickAddClose} />
    </>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    overflow: 'visible',
  },
  innerBar: {
    // Height, border, radius (iOS pill) set dynamically
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  // Active tab sub-pill: opaque rounded background behind icon + label (reference-style)
  activeSubPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: ACTIVE_SUB_PILL_PADDING_H,
    paddingVertical: ACTIVE_SUB_PILL_PADDING_V,
    borderRadius: ACTIVE_SUB_PILL_RADIUS,
  },
  // Center Add tab: fixed width so layout stays even with left/right tab groups
  addTabContainer: {
    width: ADD_TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
