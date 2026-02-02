/**
 * Dropdown (React Native).
 * Ported from frontend Dropdown; Pressable trigger + Modal with option list.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../constants/theme';

export default function Dropdown({
  options = [],
  value,
  onChange,
  icon: Icon = null,
  placeholder = 'Select...',
}) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (selectedValue) => {
    onChange?.(selectedValue);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceSecondary }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          {Icon && <Icon size={18} color={theme.colors.textSecondary} style={styles.triggerIcon} />}
          <Text style={[styles.triggerText, { color: theme.colors.text }]} numberOfLines={1}>
            {selectedOption?.label ?? placeholder}
          </Text>
        </View>
        <ChevronDown size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable style={[styles.menu, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isSelected && { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{item.label}</Text>
                    {isSelected && <Check size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  triggerIcon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    ...typography.body,
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  menu: {
    maxHeight: 320,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    ...typography.body,
  },
});
