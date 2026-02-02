/**
 * FeatureHubSheet Component
 * 
 * Bottom sheet that displays categorized features in a grid layout.
 * Used for Finance Hub and Tools Hub navigation.
 * Features staggered animations and glassmorphism styling.
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import BottomSheetMenu from './BottomSheetMenu';
import {
  FINANCE_FEATURES,
  TOOLS_FEATURES,
  LIFESTYLE_FEATURES,
  ACCOUNT_FEATURES,
} from './NavigationCategories';

/**
 * Feature item button with icon, label, and description
 */
function FeatureItem({ feature, onPress, index, theme }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const IconComponent = feature.icon;

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Staggered entrance
  const enteringAnimation = FadeInUp.delay(index * 40)
    .springify()
    .damping(18);

  return (
    <Animated.View entering={enteringAnimation} style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.featureItem,
          {
            backgroundColor: theme.dark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0.8)',
            borderColor: theme.dark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
        onPress={() => onPress(feature.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        accessibilityLabel={t(feature.labelKey)}
        accessibilityRole="button"
      >
        {/* Icon */}
        <View
          style={[
            styles.featureIcon,
            { backgroundColor: theme.colors.primary + '15' },
          ]}
        >
          <IconComponent size={22} color={theme.colors.primary} strokeWidth={2} />
        </View>

        {/* Text content (label and description use translation keys) */}
        <View style={styles.featureText}>
          <Text style={[styles.featureLabel, { color: theme.colors.text }]}>
            {t(feature.labelKey, feature.id)}
          </Text>
          <Text
            style={[styles.featureDescription, { color: theme.colors.textLight }]}
            numberOfLines={1}
          >
            {feature.descriptionKey ? t(feature.descriptionKey) : (feature.description || '')}
          </Text>
        </View>

        {/* Arrow */}
        <ChevronRight size={18} color={theme.colors.textLight} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Category section with title and features
 */
function CategorySection({ title, features, onItemPress, theme }) {
  const { t } = useTranslation();

  return (
    <View style={styles.categorySection}>
      {title && (
        <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
          {t(title)}
        </Text>
      )}
      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <FeatureItem
            key={feature.id}
            feature={feature}
            onPress={onItemPress}
            index={index}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Finance Hub Sheet
 */
export function FinanceHubSheet({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { openOverlay, closeOverlay } = useOverlay();

  useEffect(() => {
    if (!isOpen) return;
    openOverlay();
    return () => closeOverlay();
  }, [isOpen, openOverlay, closeOverlay]);

  const handleItemPress = useCallback(
    (route) => {
      onClose();
      router.push(route);
    },
    [onClose, router]
  );

  return (
    <BottomSheetMenu
      isOpen={isOpen}
      onClose={onClose}
      title={t('navigation.categories.finance', 'Finance')}
      maxHeight={0.6}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategorySection
          features={FINANCE_FEATURES}
          onItemPress={handleItemPress}
          theme={theme}
        />
      </ScrollView>
    </BottomSheetMenu>
  );
}

/**
 * Tools Hub Sheet
 */
export function ToolsHubSheet({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { openOverlay, closeOverlay } = useOverlay();

  useEffect(() => {
    if (!isOpen) return;
    openOverlay();
    return () => closeOverlay();
  }, [isOpen, openOverlay, closeOverlay]);

  const handleItemPress = useCallback(
    (route) => {
      onClose();
      router.push(route);
    },
    [onClose, router]
  );

  return (
    <BottomSheetMenu
      isOpen={isOpen}
      onClose={onClose}
      title={t('navigation.categories.tools', 'Tools')}
      maxHeight={0.55}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategorySection
          features={TOOLS_FEATURES}
          onItemPress={handleItemPress}
          theme={theme}
        />
      </ScrollView>
    </BottomSheetMenu>
  );
}

/**
 * More/Explore Hub Sheet (combines lifestyle and account)
 */
export function ExploreHubSheet({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const handleItemPress = useCallback(
    (route) => {
      onClose();
      router.push(route);
    },
    [onClose, router]
  );

  return (
    <BottomSheetMenu
      isOpen={isOpen}
      onClose={onClose}
      title={t('navigation.categories.explore', 'Explore')}
      maxHeight={0.75}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategorySection
          title="navigation.categories.lifestyle"
          features={LIFESTYLE_FEATURES}
          onItemPress={handleItemPress}
          theme={theme}
        />
        <CategorySection
          title="navigation.categories.account"
          features={ACCOUNT_FEATURES}
          onItemPress={handleItemPress}
          theme={theme}
        />
      </ScrollView>
    </BottomSheetMenu>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    // Soft shadow
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    ...typography.label,
    letterSpacing: -0.2,
  },
  featureDescription: {
    ...typography.caption,
  },
});

export default {
  FinanceHubSheet,
  ToolsHubSheet,
  ExploreHubSheet,
};
