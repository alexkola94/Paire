/**
 * ScreenHeader
 *
 * Reusable header for stack screens with a visible Menu (hamburger) button
 * so users can open the drawer from any screen. Supports optional back button,
 * title, and right-side action (e.g. Add).
 *
 * Layout: [Menu | optional leftElement] [title] [optional rightElement]
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, ChevronLeft } from 'lucide-react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

export default function ScreenHeader({
  title,
  showMenuButton = true,
  onMenuPress,
  leftElement,
  rightElement,
  onBack,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();

  const openDrawer = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  };

  return (
    <View style={styles.header}>
      {/* Left: Menu and/or custom left (e.g. back) */}
      <View style={styles.leftRow}>
        {showMenuButton && (
          <TouchableOpacity
            onPress={openDrawer}
            style={[
              styles.menuBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.glassBorder,
              },
            ]}
            accessibilityLabel={t('common.menu', 'Menu')}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Menu size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        {onBack != null && (
          <TouchableOpacity
            onPress={() => (typeof onBack === 'function' ? onBack() : router.back())}
            style={[
              styles.menuBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.glassBorder,
              },
            ]}
            accessibilityLabel={t('common.back', 'Back')}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        {leftElement != null && <View style={styles.leftElement}>{leftElement}</View>}
      </View>

      {/* Center: title */}
      <Text
        style={[styles.title, { color: theme.colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>

      {/* Right: optional action */}
      <View style={styles.rightSlot}>
        {rightElement != null ? rightElement : <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 38,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftElement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    ...typography.h2,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  placeholder: {
    width: 38,
    height: 38,
  },
});
