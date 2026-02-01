/**
 * ConfirmationModal Component (React Native)
 * Ported from frontend/src/components/ConfirmationModal.jsx
 * 
 * Features:
 * - Confirm/Cancel actions
 * - Customizable title, message, button labels
 * - Danger variant for destructive actions
 * - Warning variant for caution
 * - Theme-aware styling
 * - Loading state support
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
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
    overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    content: {
      backgroundColor: theme.colors.surface,
      ...shadows.lg,
    },
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
      animationType="fade"
      onRequestClose={loading ? undefined : onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.overlay, dynamicStyles.overlay]}
        onPress={loading ? undefined : onClose}
      >
        <Pressable
          style={[styles.content, dynamicStyles.content]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          {!loading && (
            <TouchableOpacity
              style={[styles.closeBtn, dynamicStyles.closeBtn]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel={t('common.close', 'Close')}
            >
              <X size={20} color={theme.colors.textSecondary} />
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
              onPress={onClose}
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
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
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
