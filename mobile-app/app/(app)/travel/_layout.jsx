/**
 * Travel stack: index (hub) and [id] (trip detail).
 */

import { Stack } from 'expo-router';

export default function TravelLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
