/**
 * Haptic feedback utility.
 * Wraps expo-haptics with safe fallbacks for unsupported platforms.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light impact - swipe actions, minor interactions */
export function impactLight() {
  if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium impact - FAB press, significant taps */
export function impactMedium() {
  if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy impact - destructive actions */
export function impactHeavy() {
  if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Success notification - form submission, goal completion */
export function notificationSuccess() {
  if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning notification - delete confirmation, budget alert */
export function notificationWarning() {
  if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Error notification - validation error */
export function notificationError() {
  if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Selection feedback - toggle, picker change */
export function selection() {
  if (isSupported) Haptics.selectionAsync();
}
