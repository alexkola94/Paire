/**
 * Admin stack layout.
 * Guards: redirect to profile if user is not admin.
 */

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { authService } from '../../../services/auth';

function isAdmin() {
  const user = authService.getCurrentUser();
  const roles = user?.roles || user?.Roles;
  const list = Array.isArray(roles) ? roles : [];
  return list.includes('Admin');
}

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/(auth)/login');
      return;
    }
    if (!isAdmin()) {
      router.replace('/(app)/(tabs)/profile');
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="users" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="monitoring" />
    </Stack>
  );
}
