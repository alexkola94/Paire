/**
 * PersonalitySelector – bottom sheet for chatbot personality modes
 * Modes: Supportive, Tough Love, Cheerleader, Roast, Hype
 */

import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import {
  Heart,
  Zap,
  PartyPopper,
  Flame,
  Trophy,
} from 'lucide-react-native';
import { spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const PERSONALITIES = [
  { id: 'supportive', name: 'Supportive', description: 'Warm and encouraging', icon: Heart },
  { id: 'tough_love', name: 'Tough Love', description: 'Direct and no-nonsense', icon: Zap },
  { id: 'cheerleader', name: 'Cheerleader', description: 'Super enthusiastic!', icon: PartyPopper },
  { id: 'roast', name: 'Roast', description: 'Playfully sarcastic', icon: Flame },
  { id: 'hype', name: 'Hype', description: 'Outrageously celebratory', icon: Trophy },
];

export default function PersonalitySelector({
  visible,
  onClose,
  currentPersonality = 'supportive',
  onSelect,
}) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.wrapper}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: theme.colors.glassBorder }]} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Chatbot Personality
        </Text>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {PERSONALITIES.map((p) => {
            const Icon = p.icon;
            const isSelected =
              (currentPersonality || '').toLowerCase() === p.id.toLowerCase();
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  onSelect?.(p.id);
                  onClose?.();
                }}
                style={[
                  styles.row,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(139, 92, 246, 0.15)'
                      : theme.colors.glassBg,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.glassBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isSelected ? theme.colors.primary + '30' : theme.colors.glassBg },
                  ]}
                >
                  <Icon
                    size={22}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text
                    style={[
                      styles.rowName,
                      { color: theme.colors.text },
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {p.description}
                  </Text>
                </View>
                {isSelected && (
                  <Text style={styles.check}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 40,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});
