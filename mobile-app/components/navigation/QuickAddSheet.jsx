/**
 * QuickAddSheet Component
 * 
 * Action sheet displayed when the FAB is pressed.
 * Provides quick access to add expense, income, scan receipt, and transfer.
 * Features animated entrance and glassmorphism styling.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { QUICK_ADD_ACTIONS } from './NavigationCategories';
import BottomSheetMenu from './BottomSheetMenu';

// Animated touchable for press feedback
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Individual action button with icon and label
 */
function ActionButton({ action, onPress, index, theme }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const IconComponent = action.icon;

  // Get color based on action type
  const getActionColor = () => {
    switch (action.color) {
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.primary;
    }
  };

  const actionColor = getActionColor();

  // Press animation
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Staggered entrance animation
  const enteringAnimation = FadeInDown.delay(index * 50)
    .springify()
    .damping(15);

  return (
    <Animated.View
      entering={enteringAnimation}
      style={[styles.actionWrapper, animatedStyle]}
    >
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: theme.dark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(255, 255, 255, 0.9)',
            borderColor: theme.dark
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.06)',
          },
          action.primary && {
            backgroundColor: actionColor + '15',
            borderColor: actionColor + '30',
          },
        ]}
        onPress={() => onPress(action)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        accessibilityLabel={t(action.labelKey)}
        accessibilityRole="button"
      >
        {/* Icon container with color background */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: actionColor + '20' },
          ]}
        >
          <IconComponent size={24} color={actionColor} strokeWidth={2} />
        </View>

        {/* Label */}
        <Text
          style={[
            styles.actionLabel,
            { color: theme.colors.text },
            action.primary && { fontWeight: '600' },
          ]}
        >
          {t(action.labelKey, action.id)}
        </Text>

        {/* Primary badge */}
        {action.primary && (
          <View
            style={[
              styles.primaryBadge,
              { backgroundColor: actionColor },
            ]}
          >
            <Text style={styles.primaryBadgeText}>
              {t('quickAdd.recommended', 'Quick')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Main QuickAddSheet component
 */
export default function QuickAddSheet({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  // Handle action press
  const handleActionPress = useCallback(
    (action) => {
      onClose();

      // Navigate or perform action based on type
      switch (action.action) {
        case 'add-expense':
          // Navigate to transactions with expense type pre-selected
          router.push({
            pathname: '/(app)/transactions',
            params: { type: 'expense', openForm: 'true' },
          });
          break;
        case 'add-income':
          // Navigate to transactions with income type pre-selected
          router.push({
            pathname: '/(app)/transactions',
            params: { type: 'income', openForm: 'true' },
          });
          break;
        case 'scan-receipt':
          // Navigate to receipts with scan mode
          router.push({
            pathname: '/(app)/receipts',
            params: { mode: 'scan' },
          });
          break;
        case 'transfer':
          // Navigate to transactions with transfer type
          router.push({
            pathname: '/(app)/transactions',
            params: { type: 'transfer', openForm: 'true' },
          });
          break;
        default:
          break;
      }
    },
    [onClose, router]
  );

  return (
    <BottomSheetMenu
      isOpen={isOpen}
      onClose={onClose}
      title={t('quickAdd.title', 'Quick Add')}
      maxHeight={0.45}
    >
      <View style={styles.container}>
        {/* Action buttons grid */}
        <View style={styles.actionsGrid}>
          {QUICK_ADD_ACTIONS.map((action, index) => (
            <ActionButton
              key={action.id}
              action={action}
              onPress={handleActionPress}
              index={index}
              theme={theme}
            />
          ))}
        </View>

        {/* Hint text */}
        <Text style={[styles.hint, { color: theme.colors.textLight }]}>
          {t('quickAdd.hint', 'Tap an option to get started')}
        </Text>
      </View>
    </BottomSheetMenu>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionWrapper: {
    width: '47%', // 2 columns with gap
  },
  actionButton: {
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
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    ...typography.label,
    letterSpacing: -0.2,
  },
  primaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
