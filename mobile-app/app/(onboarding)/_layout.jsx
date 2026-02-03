/**
 * Onboarding Layout
 *
 * Stack navigator for the 4-step onboarding wizard.
 * Steps: Currency -> Partner -> Budget -> Transaction -> Done
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function OnboardingLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent back swipe during onboarding
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="partner" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="transaction" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
