/**
 * Reusable Modal (React Native).
 * Ported from frontend Modal; uses RN Modal + View/Text/TouchableOpacity.
 */

import React, { useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
}) {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    // Optional: back handler on Android
    return () => {};
  }, [isOpen]);

  if (!isOpen) return null;

  const dynamicStyles = {
    overlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
    content: {
      backgroundColor: theme.colors.surface,
      ...shadows.lg,
    },
    headerBorder: { borderBottomColor: theme.colors.surfaceSecondary },
    title: { color: theme.colors.text },
    closeBtn: { backgroundColor: theme.colors.surfaceSecondary },
    closeIcon: theme.colors.textSecondary,
  };

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={[styles.overlay, dynamicStyles.overlay]} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centered}
        >
          <Pressable
            style={[styles.content, dynamicStyles.content]}
            onPress={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <View style={[styles.header, dynamicStyles.headerBorder]}>
                {title && (
                  <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {showCloseButton && (
                  <TouchableOpacity
                    style={[styles.closeBtn, dynamicStyles.closeBtn]}
                    onPress={onClose}
                    accessibilityLabel="Close"
                    activeOpacity={0.7}
                  >
                    <X size={22} color={dynamicStyles.closeIcon} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.body}>{children}</View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    ...typography.h3,
    marginRight: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    maxHeight: 400,
  },
});
