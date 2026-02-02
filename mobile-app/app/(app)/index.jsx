/**
 * App group index – redirects to main tabs (dashboard).
 * Ensures /(app) lands on the tab navigator.
 */

import { Redirect } from 'expo-router';

export default function AppIndex() {
  return <Redirect href="/(app)/(tabs)/dashboard" />;
}
