/**
 * Reusable Modal (React Native) - Bottom Sheet Style
 * All modals rise from the bottom of the screen with a drag handle.
 * Features: slide-up animation, gesture dismiss, safe area support.
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
  Dimensions,
  ScrollView,
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
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxHeight = 0.85, // Maximum height as percentage of screen (default 85%)
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  
  // Animation shared values
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(SCREEN_HEIGHT);
  const contentOpacity = useSharedValue(0);

  // Animate in when modal opens
  useEffect(() => {
    if (isOpen) {
      if (reducedMotion) {
        overlayOpacity.value = 0.5;
        contentTranslateY.value = 0;
        contentOpacity.value = 1;
      } else {
        // Fade in overlay
        overlayOpacity.value = withTiming(0.5, { duration: 150 });
        // Slide up from bottom - clean, swift animation
        contentTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        contentOpacity.value = withTiming(1, { duration: 150 });
      }
    }
  }, [isOpen]);

  // Animate out and close
  const handleClose = () => {
    if (reducedMotion) {
      onClose();
      return;
    }
    
    // Slide down and fade out
    overlayOpacity.value = withTiming(0, { duration: 120 });
    contentOpacity.value = withTiming(0, { duration: 100 });
    contentTranslateY.value = withTiming(
      SCREEN_HEIGHT * 0.3,
      { duration: 200, easing: Easing.in(Easing.cubic) },
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

  const dynamicStyles = {
    content: {
      backgroundColor: theme.colors.background,
      ...shadows.lg,
    },
    handle: { backgroundColor: theme.colors.textLight },
    headerBorder: { borderBottomColor: theme.colors.glassBorder },
    title: { color: theme.colors.text },
    closeBtn: { backgroundColor: theme.colors.surfaceSecondary },
    closeIcon: theme.colors.textSecondary,
  };

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.content,
                  dynamicStyles.content,
                  contentAnimatedStyle,
                  { 
                    maxHeight: SCREEN_HEIGHT * maxHeight,
                    paddingBottom: insets.bottom + spacing.md,
                  },
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, dynamicStyles.handle]} />
                </View>

                {/* Header with title and close button */}
                {(title || showCloseButton) && (
                  <View style={[styles.header, dynamicStyles.headerBorder]}>
                    {title ? (
                      <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
                        {title}
                      </Text>
                    ) : (
                      <View style={styles.titlePlaceholder} />
                    )}
                    {showCloseButton && (
                      <TouchableOpacity
                        style={[styles.closeBtn, dynamicStyles.closeBtn]}
                        onPress={handleClose}
                        accessibilityLabel="Close"
                        activeOpacity={0.7}
                      >
                        <X size={20} color={dynamicStyles.closeIcon} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Scrollable body */}
                <ScrollView 
                  style={styles.body} 
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  {children}
                </ScrollView>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
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
  keyboardView: {
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  // Drag handle indicator
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
  title: {
    flex: 1,
    ...typography.h3,
    marginRight: spacing.sm,
  },
  titlePlaceholder: {
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Body
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.md,
  },
});
