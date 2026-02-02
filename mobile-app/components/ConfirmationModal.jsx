/**
 * ConfirmationModal Component (React Native) - Bottom Sheet Style
 * All confirmation dialogs rise from the bottom of the screen.
 * 
 * Features:
 * - Confirm/Cancel actions
 * - Customizable title, message, button labels
 * - Danger variant for destructive actions
 * - Warning variant for caution
 * - Theme-aware styling
 * - Loading state support
 * - Bottom sheet animation
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger', // 'danger' | 'warning'
  loading = false,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Animation shared values
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(300);
  const contentOpacity = useSharedValue(0);

  // Animate in when modal opens
  useEffect(() => {
    if (isOpen) {
      if (reducedMotion) {
        overlayOpacity.value = 0.5;
        contentTranslateY.value = 0;
        contentOpacity.value = 1;
      } else {
        overlayOpacity.value = withTiming(0.5, { duration: 150 });
        // Clean, swift slide-up animation
        contentTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        contentOpacity.value = withTiming(1, { duration: 150 });
      }
    }
  }, [isOpen]);

  // Animate out and close
  const handleClose = () => {
    if (loading) return;
    
    if (reducedMotion) {
      onClose();
      return;
    }

    overlayOpacity.value = withTiming(0, { duration: 120 });
    contentOpacity.value = withTiming(0, { duration: 100 });
    contentTranslateY.value = withTiming(
      200,
      { duration: 180, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      }
    );
  };

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${overlayOpacity.value})`,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  if (!isOpen) return null;

  // Default texts
  const defaultTitle = variant === 'danger'
    ? t('confirmationModal.deleteTitle', 'Confirm Delete')
    : t('confirmationModal.warningTitle', 'Warning');
  const defaultMessage = t('confirmationModal.defaultMessage', 'Are you sure you want to proceed?');
  const defaultConfirmText = variant === 'danger'
    ? t('confirmationModal.delete', 'Delete')
    : t('confirmationModal.confirm', 'Confirm');
  const defaultCancelText = t('common.cancel', 'Cancel');

  // Variant colors
  const variantColor = variant === 'danger' ? theme.colors.error : theme.colors.warning;
  const variantBgColor = variant === 'danger' ? `${theme.colors.error}15` : `${theme.colors.warning}15`;

  // Handle confirm
  const handleConfirm = () => {
    if (!loading) {
      onConfirm?.();
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    content: {
      backgroundColor: theme.colors.background,
      ...shadows.lg,
    },
    handle: { backgroundColor: theme.colors.textLight },
    iconBg: { backgroundColor: variantBgColor },
    title: { color: theme.colors.text },
    message: { color: theme.colors.textSecondary },
    cancelBtn: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    cancelBtnText: { color: theme.colors.text },
    confirmBtn: { backgroundColor: variantColor },
    confirmBtnText: { color: '#ffffff' },
    closeBtn: { backgroundColor: theme.colors.surfaceSecondary },
  };

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={loading ? undefined : handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable
          style={styles.overlayPressable}
          onPress={loading ? undefined : handleClose}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.content,
                dynamicStyles.content,
                contentAnimatedStyle,
                { paddingBottom: insets.bottom + spacing.lg },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, dynamicStyles.handle]} />
              </View>

              {/* Close Button */}
              {!loading && (
                <TouchableOpacity
                  style={[styles.closeBtn, dynamicStyles.closeBtn]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  accessibilityLabel={t('common.close', 'Close')}
                >
                  <X size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              {/* Icon */}
              <View style={[styles.iconContainer, dynamicStyles.iconBg]}>
                <AlertTriangle size={32} color={variantColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, dynamicStyles.title]}>
                {title || defaultTitle}
              </Text>

              {/* Message */}
              <Text style={[styles.message, dynamicStyles.message]}>
                {message || defaultMessage}
              </Text>

              {/* Actions */}
              <View style={styles.actions}>
                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.button, styles.cancelBtn, dynamicStyles.cancelBtn]}
                  onPress={handleClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, dynamicStyles.cancelBtnText]}>
                    {cancelText || defaultCancelText}
                  </Text>
                </TouchableOpacity>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmBtn,
                    dynamicStyles.confirmBtn,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={[styles.buttonText, dynamicStyles.confirmBtnText]}>
                      {confirmText || defaultConfirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: 0,
    alignItems: 'center',
    position: 'relative',
  },
  // Drag handle indicator
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    width: '100%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.label,
  },
});
