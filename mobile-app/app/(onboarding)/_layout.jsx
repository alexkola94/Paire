/**
 * Onboarding Layout
 *
 * Stack navigator for the 4-step onboarding wizard.
 * Steps: Currency -> Partner -> Budget -> Transaction -> Done
 * CalculatorProvider wraps onboarding so AddToCalculatorButton works on budget step.
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { CalculatorProvider } from '../../context/CalculatorContext';
import { OverlayProvider } from '../../context/OverlayContext';

export default function OnboardingLayout() {
  const { theme } = useTheme();

  return (
    <CalculatorProvider>
      <OverlayProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false, // Prevent back swipe on first steps
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="partner" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="transaction" options={{ gestureEnabled: true }} />
          <Stack.Screen name="complete" />
        </Stack>
      </OverlayProvider>
    </CalculatorProvider>
  );
}
