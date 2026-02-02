/**
 * Reusable Modal (React Native).
 * Ported from frontend Modal with smooth animations using react-native-reanimated.
 * Features slide-up content with fade overlay.
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
  withSpring,
  runOnJS,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';
import { MODAL_ANIMATIONS } from '../utils/animations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
}) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  
  // Animation shared values
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(SCREEN_HEIGHT * 0.3);
  const contentOpacity = useSharedValue(0);

  // Animate in when modal opens - faster, snappier animations
  useEffect(() => {
    if (isOpen) {
      if (reducedMotion) {
        overlayOpacity.value = 0.5;
        contentTranslateY.value = 0;
        contentOpacity.value = 1;
      } else {
        // Faster overlay fade
        overlayOpacity.value = withTiming(0.5, { duration: 150 });
        // Snappier spring with higher stiffness
        contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 280 });
        contentOpacity.value = withTiming(1, { duration: 180 });
      }
    }
  }, [isOpen]);

  // Animate out and close - swift exit
  const handleClose = () => {
    if (reducedMotion) {
      onClose();
      return;
    }
    
    // Faster exit animations
    overlayOpacity.value = withTiming(0, { duration: 120 });
    contentOpacity.value = withTiming(0, { duration: 100 });
    contentTranslateY.value = withTiming(
      80,
      { duration: 150, easing: Easing.in(Easing.cubic) },
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
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.centered}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[styles.content, dynamicStyles.content, contentAnimatedStyle]}
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
                        onPress={handleClose}
                        accessibilityLabel="Close"
                        activeOpacity={0.7}
                      >
                        <X size={22} color={dynamicStyles.closeIcon} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {/* Scrollable body to handle forms with many fields */}
                <ScrollView 
                  style={styles.body} 
                  contentContainerStyle={styles.bodyContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
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
    maxHeight: '75%', // Allow body to take up to 75% of modal, scrollable
  },
  bodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg, // Reduced padding for more compact layout
  },
});
