/**
 * Bills Tab Screen
 *
 * Renders the Recurring Bills screen as the third tab in the floating bar.
 * Registers tab index for transition animations (Dashboard=0, Transactions=1, Bills=2, Profile=3).
 */

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTabTransition } from '../../../context/TabTransitionContext';
import RecurringBillsScreen from '../recurring-bills';

const TAB_INDEX = 2; // Bills is third tab

export default function BillsTabScreen() {
  const { registerTabIndex } = useTabTransition();

  useFocusEffect(
    useCallback(() => {
      registerTabIndex(TAB_INDEX);
    }, [registerTabIndex])
  );

  return <RecurringBillsScreen />;
}
