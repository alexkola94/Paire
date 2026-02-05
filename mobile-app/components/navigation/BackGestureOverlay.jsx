/**
 * BackGestureOverlay
 *
 * When canGoBack is true, renders a thin strip on the left edge that captures
 * a rightward pan gesture and calls router.back(), so the back gesture does
 * not open the drawer. Only the left strip receives touches; the rest of the
 * screen is untouched.
 */

import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import { useBackGestureContext } from '../../context/BackGestureContext';
import { impactLight } from '../../utils/haptics';

const EDGE_WIDTH = 24;
const SWIPE_THRESHOLD = 50;

export default function BackGestureOverlay() {
  const router = useRouter();
  const { canGoBack } = useBackGestureContext();

  const handleBack = useCallback(() => {
    impactLight();
    router.back();
  }, [router]);

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .activeOffsetX([0, 999])
    .onEnd((e) => {
      if (e.translationX >= SWIPE_THRESHOLD || e.velocityX >= 200) {
        runOnJS(handleBack)();
      }
    });

  if (!canGoBack) return null;

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      accessibilityLabel="Swipe to go back"
      accessibilityRole="button"
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.edgeStrip} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 8,
  },
  edgeStrip: {
    flex: 1,
    width: EDGE_WIDTH,
  },
});
