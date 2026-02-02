/**
 * Dropdown (React Native) - Bottom Sheet Style
 * Pressable trigger + Bottom sheet modal with option list.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
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
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

export default function Dropdown({
  options = [],
  value,
  onChange,
  icon: Icon = null,
  placeholder = 'Select...',
  label,
  style,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  // Animation shared values
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(300);
  const contentOpacity = useSharedValue(0);

  const selectedOption = options.find((opt) => opt.value === value);

  // Animate in when dropdown opens
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
    if (reducedMotion) {
      setIsOpen(false);
      return;
    }

    overlayOpacity.value = withTiming(0, { duration: 120 });
    contentOpacity.value = withTiming(0, { duration: 100 });
    contentTranslateY.value = withTiming(
      200,
      { duration: 180, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setIsOpen)(false);
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

  const handleSelect = (selectedValue) => {
    onChange?.(selectedValue);
    handleClose();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, style]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          {Icon && <Icon size={18} color={theme.colors.textSecondary} style={styles.triggerIcon} />}
          <Text style={[styles.triggerText, { color: theme.colors.text }]} numberOfLines={1}>
            {selectedOption?.label ?? placeholder}
          </Text>
        </View>
        <ChevronDown size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <Pressable style={styles.overlayPressable} onPress={handleClose}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.menu,
                  { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + spacing.md },
                  shadows.lg,
                  contentAnimatedStyle,
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: theme.colors.textLight }]} />
                </View>

                {/* Header */}
                {label && (
                  <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{label}</Text>
                    <TouchableOpacity
                      style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                      onPress={handleClose}
                    >
                      <X size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Options List */}
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.value)}
                  style={styles.list}
                  bounces={false}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.option,
                          { borderBottomColor: theme.colors.glassBorder },
                          isSelected && { backgroundColor: theme.colors.primary + '10' },
                        ]}
                        onPress={() => handleSelect(item.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: isSelected ? theme.colors.primary : theme.colors.text },
                            isSelected && { fontWeight: '600' },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && <Check size={20} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  triggerIcon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    ...typography.body,
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menu: {
    width: '100%',
    maxHeight: '60%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  // Drag handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // List
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    ...typography.body,
    flex: 1,
  },
});
