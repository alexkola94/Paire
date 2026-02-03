/**
 * AddToCalculatorButton (React Native)
 * Small icon button next to amount; on press shows operation picker (+, −, ×, ÷).
 * User chooses how the value is applied, then it's added to the global calculator.
 * Optional onAdded callback for showing a success toast ("Added to calculator").
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react-native';
import { useCalculator } from '../context/CalculatorContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../constants/theme';

const OPERATORS = [
  { op: '+', labelKey: 'calculator.add', symbol: '+' },
  { op: '-', labelKey: 'calculator.subtract', symbol: '−' },
  { op: '*', labelKey: 'calculator.multiply', symbol: '×' },
  { op: '/', labelKey: 'calculator.divide', symbol: '÷' },
];

export default function AddToCalculatorButton({
  value,
  isPrivate,
  size = 18,
  onAdded,
  style,
}) {
  const { t } = useTranslation();
  const { addToCalculator } = useCalculator();
  const { theme } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleOperatorSelect = (operator) => {
    addToCalculator(value, operator);
    setPickerVisible(false);
    onAdded?.();
  };

  if (isPrivate) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={[
          styles.button,
          {
            backgroundColor: `${theme.colors.primary}15`,
            borderRadius: borderRadius.md,
          },
          style,
        ]}
        activeOpacity={0.7}
        accessibilityLabel={t('calculator.addToCalculator')}
        accessibilityHint={t('calculator.addAs')}
      >
        <Calculator size={size} color={theme.colors.primary} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerVisible(false)}
            accessibilityLabel={t('calculator.addAs')}
            accessibilityRole="button"
          />
          <View
            style={[
              styles.picker,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.pickerTitle, { color: theme.colors.textSecondary }]}>
              {t('calculator.addAs')}
            </Text>
            <View style={styles.operatorRow}>
              {OPERATORS.map(({ op, labelKey, symbol }) => (
                <TouchableOpacity
                  key={op}
                  style={[
                    styles.opButton,
                    { backgroundColor: `${theme.colors.primary}15` },
                  ]}
                  onPress={() => handleOperatorSelect(op)}
                  activeOpacity={0.7}
                  accessibilityLabel={t(labelKey)}
                >
                  <Text style={[styles.opSymbol, { color: theme.colors.primary }]}>
                    {symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  picker: {
    width: '100%',
    maxWidth: 280,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  pickerTitle: {
    fontSize: 14,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  operatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  opButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opSymbol: {
    fontSize: 24,
    fontWeight: '600',
  },
});
