/**
 * Toast notifications (React Native).
 * Ported from frontend Toast with smooth animations using react-native-reanimated.
 * Features slide-in from top with spring animation.
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// Provide a convenient showToast helper
export function useToastHelpers() {
  const toast = useToast();
  return {
    showToast: (message, type = 'info', duration = 3000) => {
      if (type === 'success') return toast.success(message, duration);
      if (type === 'error') return toast.error(message, duration);
      if (type === 'warning') return toast.warning(message, duration);
      return toast.info(message, duration);
    },
    ...toast,
  };
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const typeColors = {
  success: { bg: '#10B981', border: '#10B981', icon: '#10B981' },
  error: { bg: '#EF4444', border: '#EF4444', icon: '#EF4444' },
  warning: { bg: '#F59E0B', border: '#F59E0B', icon: '#F59E0B' },
  info: { bg: '#3B82F6', border: '#3B82F6', icon: '#3B82F6' },
};

function ToastItem({ message, type = 'info', duration = 3000, onClose, index = 0 }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  
  // Animation values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    // Entrance animation
    if (reducedMotion) {
      translateY.value = 0;
      opacity.value = 1;
      scale.value = 1;
    } else {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    }
  }, []);

  const handleClose = useCallback(() => {
    if (reducedMotion) {
      onClose?.();
      return;
    }
    
    // Exit animation
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.9, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, reducedMotion]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const IconComponent = icons[type] || Info;
  const colors = typeColors[type] || typeColors.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.colors.surface,
          borderColor: colors.border,
          borderLeftWidth: 4,
        },
        shadows.md,
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.bg + '20' }]}>
        <IconComponent size={20} color={colors.icon} />
      </View>
      <Text style={[styles.toastMessage, { color: theme.colors.text }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={handleClose}
        style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
        accessibilityLabel={t('common.close')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = {
    addToast,
    removeToast,
    success: (msg, dur) => addToast(msg, 'success', dur ?? 3000),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 3000),
    info: (msg, dur) => addToast(msg, 'info', dur ?? 3000),
    warning: (msg, dur) => addToast(msg, 'warning', dur ?? 3000),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.lg + 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10000,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 56,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastMessage: {
    flex: 1,
    ...typography.bodySmall,
    fontWeight: '500',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ToastProvider;
