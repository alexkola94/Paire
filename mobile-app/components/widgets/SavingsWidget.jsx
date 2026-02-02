/**
 * SavingsWidget Component
 * 
 * Displays savings goals progress.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PiggyBank, ChevronRight, Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import AnimatedCard from '../AnimatedCard';

export default function SavingsWidget({ 
  goals = [], 
  onPress,
  maxDisplay = 3,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  
  if (!goals?.length) {
    return null;
  }
  
  const displayGoals = goals.slice(0, maxDisplay);
  const formatAmount = (n) => (isPrivacyMode ? '••••' : `€${Number(n).toFixed(0)}`);
  
  // Calculate total progress
  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  
  return (
    <AnimatedCard onPress={onPress} style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
        <View style={styles.header}>
          <PiggyBank size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('savingsGoals.title', 'Savings Goals')}
          </Text>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </View>
        
        {/* Overall Progress */}
        <View style={[styles.overallCard, { backgroundColor: theme.colors.primary + '10' }]}>
          <View style={styles.overallInfo}>
            <Text style={[styles.overallLabel, { color: theme.colors.textSecondary }]}>
              {t('savingsGoals.overallProgress', 'Overall Progress')}
            </Text>
            <Text style={[styles.overallPct, { color: theme.colors.primary }]}>
              {overallPct.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(overallPct, 100)}%`, 
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
          </View>
          <Text style={[styles.overallAmount, { color: theme.colors.text }]}>
            {formatAmount(totalCurrent)} / {formatAmount(totalTarget)}
          </Text>
        </View>
        
        {/* Individual Goals */}
        {displayGoals.map((goal) => {
          const pct = goal.targetAmount > 0 
            ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
            : 0;
          const isAchieved = pct >= 100;
          
          return (
            <View key={goal.id} style={styles.goalRow}>
              <View style={[
                styles.goalIcon, 
                { backgroundColor: isAchieved ? theme.colors.success + '20' : theme.colors.primary + '20' }
              ]}>
                <Target size={14} color={isAchieved ? theme.colors.success : theme.colors.primary} />
              </View>
              <View style={styles.goalInfo}>
                <Text style={[styles.goalName, { color: theme.colors.text }]} numberOfLines={1}>
                  {goal.name}
                </Text>
                <View style={[styles.goalProgressBg, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <View 
                    style={[
                      styles.goalProgressFill, 
                      { 
                        width: `${pct}%`, 
                        backgroundColor: isAchieved ? theme.colors.success : theme.colors.primary 
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text style={[styles.goalPct, { color: theme.colors.textSecondary }]}>
                {pct.toFixed(0)}%
              </Text>
            </View>
          );
        })}
        
        {goals.length > maxDisplay && (
          <Text style={[styles.moreText, { color: theme.colors.textLight }]}>
            +{goals.length - maxDisplay} {t('common.more', 'more')}
          </Text>
        )}
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  overallCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  overallInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overallLabel: {
    ...typography.caption,
  },
  overallPct: {
    ...typography.label,
    fontSize: 18,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  overallAmount: {
    ...typography.caption,
    textAlign: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  goalProgressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalPct: {
    width: 35,
    textAlign: 'right',
    fontSize: 12,
  },
  moreText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
