/**
 * Toast notifications (React Native).
 * Ported from frontend Toast; ToastProvider + Toast item with View/Text/TouchableOpacity.
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const typeColors = {
  success: { bg: '#2ecc71', border: '#27ae60', icon: '#27ae60' },
  error: { bg: '#e74c3c', border: '#c0392b', icon: '#c0392b' },
  warning: { bg: '#f1c40f', border: '#f39c12', icon: '#f39c12' },
  info: { bg: '#3498db', border: '#2980b9', icon: '#2980b9' },
};

function ToastItem({ message, type = 'info', duration = 3000, onClose }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      useNativeDriver: true,
      duration: 200,
    }).start(() => onClose?.());
  };

  useEffect(() => {
    if (duration > 0) {
      const t = setTimeout(handleClose, duration);
      return () => clearTimeout(t);
    }
  }, [duration]);

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
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <IconComponent size={20} color={colors.icon} style={styles.toastIcon} />
      <Text style={[styles.toastMessage, { color: theme.colors.text }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeBtn}
        accessibilityLabel={t('common.close')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={18} color={theme.colors.textSecondary} />
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
    top: spacing.lg + 40,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10000,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    minHeight: 52,
  },
  toastIcon: {
    marginRight: spacing.xs,
  },
  toastMessage: {
    flex: 1,
    ...typography.bodySmall,
  },
  closeBtn: {
    padding: spacing.xs,
  },
});

export default ToastProvider;
