/**
 * WidgetSelector Component
 * 
 * Modal for customizing dashboard widgets.
 * Features:
 * - Toggle widget visibility
 * - Drag to reorder (simplified - uses move up/down buttons)
 * - Persist configuration
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { 
  Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Check,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';
import Modal from './Modal';
import Button from './Button';
import { WIDGET_REGISTRY, getWidgetById } from './widgets';

export default function WidgetSelector({
  isOpen,
  onClose,
  layout,
  onSave,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Local state for editing
  const [localLayout, setLocalLayout] = useState([...layout]);
  
  // Reset local layout when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalLayout([...layout]);
    }
  }, [isOpen, layout]);
  
  // Toggle widget visibility
  const toggleVisibility = useCallback((widgetId) => {
    setLocalLayout((prev) =>
      prev.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);
  
  // Move widget up in order
  const moveUp = useCallback((widgetId) => {
    setLocalLayout((prev) => {
      const index = prev.findIndex((item) => item.id === widgetId);
      if (index <= 0) return prev;
      const newLayout = [...prev];
      [newLayout[index - 1], newLayout[index]] = [newLayout[index], newLayout[index - 1]];
      return newLayout.map((item, i) => ({ ...item, order: i }));
    });
  }, []);
  
  // Move widget down in order
  const moveDown = useCallback((widgetId) => {
    setLocalLayout((prev) => {
      const index = prev.findIndex((item) => item.id === widgetId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newLayout = [...prev];
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
      return newLayout.map((item, i) => ({ ...item, order: i }));
    });
  }, []);
  
  // Reset to defaults
  const resetToDefault = useCallback(() => {
    const defaultLayout = WIDGET_REGISTRY.map((widget) => ({
      id: widget.id,
      visible: widget.defaultVisible,
      order: widget.defaultOrder,
    }));
    setLocalLayout(defaultLayout);
  }, []);
  
  // Save changes
  const handleSave = useCallback(() => {
    onSave(localLayout);
    onClose();
  }, [localLayout, onSave, onClose]);
  
  // Sort by order
  const sortedLayout = [...localLayout].sort((a, b) => a.order - b.order);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('widgets.customize', 'Customize Dashboard')}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {t('widgets.customizeDescription', 'Toggle and reorder widgets to personalize your dashboard')}
        </Text>
        
        {/* Widget List */}
        <View style={styles.widgetList}>
          {sortedLayout.map((item, index) => {
            const widgetConfig = getWidgetById(item.id);
            if (!widgetConfig) return null;
            
            const IconComponent = widgetConfig.icon;
            const isFirst = index === 0;
            const isLast = index === sortedLayout.length - 1;
            
            return (
              <View
                key={item.id}
                style={[
                  styles.widgetRow,
                  { 
                    backgroundColor: item.visible 
                      ? theme.colors.surface 
                      : theme.colors.surfaceSecondary + '50',
                    borderColor: theme.colors.glassBorder,
                  },
                ]}
              >
                {/* Widget Info */}
                <View style={styles.widgetInfo}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primary + '15' }
                  ]}>
                    <IconComponent size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.widgetText}>
                    <Text style={[styles.widgetName, { color: theme.colors.text }]}>
                      {t(widgetConfig.name)}
                    </Text>
                    <Text style={[styles.widgetDesc, { color: theme.colors.textSecondary }]}>
                      {t(widgetConfig.description)}
                    </Text>
                  </View>
                </View>
                
                {/* Controls */}
                <View style={styles.controls}>
                  {/* Reorder buttons */}
                  <TouchableOpacity
                    onPress={() => moveUp(item.id)}
                    disabled={isFirst}
                    style={[styles.controlBtn, isFirst && styles.controlBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronUp 
                      size={18} 
                      color={isFirst ? theme.colors.textLight : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(item.id)}
                    disabled={isLast}
                    style={[styles.controlBtn, isLast && styles.controlBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronDown 
                      size={18} 
                      color={isLast ? theme.colors.textLight : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  
                  {/* Visibility toggle */}
                  <TouchableOpacity
                    onPress={() => toggleVisibility(item.id)}
                    style={[
                      styles.visibilityBtn,
                      { 
                        backgroundColor: item.visible 
                          ? theme.colors.primary + '20' 
                          : theme.colors.surfaceSecondary 
                      }
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {item.visible ? (
                      <Eye size={18} color={theme.colors.primary} />
                    ) : (
                      <EyeOff size={18} color={theme.colors.textLight} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: theme.colors.glassBorder }]}
          onPress={resetToDefault}
          activeOpacity={0.7}
        >
          <RotateCcw size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>
            {t('widgets.resetToDefault', 'Reset to Default')}
          </Text>
        </TouchableOpacity>
        
        {/* Save Button */}
        <View style={styles.saveContainer}>
          <Button
            title={t('widgets.saveChanges', 'Save Changes')}
            onPress={handleSave}
            leftIcon={Check}
          />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 450,
  },
  description: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  widgetList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  widgetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetText: {
    flex: 1,
  },
  widgetName: {
    ...typography.label,
    marginBottom: 2,
  },
  widgetDesc: {
    ...typography.caption,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlBtn: {
    padding: spacing.xs,
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  visibilityBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  resetText: {
    ...typography.bodySmall,
  },
  saveContainer: {
    marginBottom: spacing.md,
  },
});
