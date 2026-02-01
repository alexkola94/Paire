/**
 * Trip stack: index (trip detail), budget, itinerary, packing, documents.
 */

import { Stack } from 'expo-router';

export default function TripIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="itinerary" />
      <Stack.Screen name="packing" />
      <Stack.Screen name="documents" />
    </Stack>
  );
}
