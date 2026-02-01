import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        fullScreenGestureShadowEnabled: true,
        animationMatchesGesture: true,
        sheetGrabberVisible: false,
        sheetExpandsWhenScrolledToEdge: true,
        sheetShouldOverflowTopInset: false,
        sheetResizeAnimationEnabled: true,
        freezeOnBlur: false,
        autoHideHomeIndicator: false,
        keyboardHandlingEnabled: true,
        navigationBarTranslucent: false,
        navigationBarHidden: false,
        statusBarHidden: false,
        statusBarTranslucent: false,
      }}
    />
  );
}
