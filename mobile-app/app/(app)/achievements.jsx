/**
 * Achievements Screen (React Native)
 * Displays user achievements with progress tracking.
 * Uses achievementService from api; supports category filter and unlocked-only filter.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  Lock,
} from 'lucide-react-native';
import { achievementService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Dropdown } from '../../components';

// Map backend icon names to Lucide components
const iconMap = {
  FiAward: Award,
  FiStar: Star,
  FiTarget: Target,
  FiTrendingDown: TrendingDown,
  FiTrendingUp: TrendingUp,
  FiUsers: Users,
  FiCalendar: Calendar,
  FiCheckCircle: CheckCircle,
};

function getIconComponent(iconName) {
  return iconMap[iconName] || Award;
}

function getRarityColor(rarity, theme) {
  switch (rarity) {
    case 'legendary':
      return '#f59e0b';
    case 'epic':
      return '#8b5cf6';
    case 'rare':
      return '#3b82f6';
    default:
      return theme.colors.textSecondary;
  }
}

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: achievementsData, refetch, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementService.getAll(),
  });

  const { data: stats } = useQuery({
    queryKey: ['achievements-stats'],
    queryFn: () => achievementService.getStats(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const achievements = achievementsData || [];
  const categories = ['all', ...new Set(achievements.map((a) => a.achievement?.category).filter(Boolean))];

  const filteredAchievements = achievements.filter((item) => {
    const ach = item.achievement;
    if (!ach) return false;
    if (selectedCategory !== 'all' && ach.category !== selectedCategory) return false;
    if (showUnlockedOnly && !item.isUnlocked) return false;
    return true;
  });

  const categoryOptions = categories.map((cat) => ({
    value: cat,
    label: t(`achievements.categories.${cat}`, cat),
  }));

  const renderAchievement = ({ item }) => {
    const achievement = item.achievement;
    const isUnlocked = item.isUnlocked;
    const progress = item.progress || 0;
    const IconComponent = getIconComponent(achievement?.icon || 'FiAward');
    const rarityColor = getRarityColor(achievement?.rarity, theme);

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderLeftColor: rarityColor, opacity: isUnlocked ? 1 : 0.85 },
          shadows.sm,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: (isUnlocked ? rarityColor : theme.colors.textLight) + '20' }]}>
          {isUnlocked ? (
            <IconComponent size={28} color={rarityColor} />
          ) : (
            <Lock size={28} color={theme.colors.textLight} />
          )}
          {isUnlocked && <CheckCircle size={16} color={theme.colors.success} style={styles.badgeIcon} />}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {achievement?.name}
          </Text>
          <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {achievement?.description}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.rarity, { color: rarityColor }]}>
              {t(`achievements.rarity.${achievement?.rarity || 'common'}`, achievement?.rarity)}
            </Text>
            <Text style={[styles.points, { color: theme.colors.textSecondary }]}>
              {achievement?.points ?? 0} {t('achievements.points')}
            </Text>
          </View>
          {!isUnlocked && progress > 0 && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: rarityColor }]} />
              </View>
              <Text style={[styles.progressPct, { color: theme.colors.textSecondary }]}>{Math.round(progress)}%</Text>
            </View>
          )}
          {isUnlocked && item.userAchievement?.unlockedAt && (
            <Text style={[styles.unlockedOn, { color: theme.colors.textSecondary }]}>
              {t('achievements.unlockedOn')} {new Date(item.userAchievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('achievements.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('achievements.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('achievements.subtitle')}</Text>

        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.unlocked ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('achievements.stats.unlocked')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.total ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('achievements.stats.total')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.totalPoints ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('achievements.stats.points')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }, shadows.sm]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{Math.round(stats.percentage ?? 0)}%</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('achievements.stats.completion')}</Text>
            </View>
          </View>
        )}

        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>{t('achievements.filters.category')}</Text>
            <Dropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              placeholder={t('achievements.categories.all')}
            />
          </View>
          <TouchableOpacity
            style={[styles.checkRow, { backgroundColor: theme.colors.surface }, shadows.sm]}
            onPress={() => setShowUnlockedOnly((v) => !v)}
          >
            <Text style={[styles.checkLabel, { color: theme.colors.text }]}>{t('achievements.filters.unlockedOnly')}</Text>
            <View style={[styles.checkbox, showUnlockedOnly && { backgroundColor: theme.colors.primary }]}>
              {showUnlockedOnly && <CheckCircle size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>

        {filteredAchievements.length === 0 ? (
          <View style={styles.empty}>
            <Award size={48} color={theme.colors.textLight} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('achievements.noAchievements')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAchievements}
            keyExtractor={(item) => String(item.achievement?.id ?? Math.random())}
            renderItem={renderAchievement}
            scrollEnabled={false}
            listKey="achievements-list"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 120 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { ...typography.body },
  title: { ...typography.h2, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    width: '48%',
    minWidth: 100,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.label, marginTop: spacing.xs },
  filters: { marginBottom: spacing.lg, gap: spacing.sm },
  filterRow: { gap: spacing.xs },
  filterLabel: { ...typography.label },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  checkLabel: { ...typography.body },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  badgeIcon: { position: 'absolute', top: -4, right: -4 },
  cardContent: { flex: 1 },
  cardTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing.xs },
  cardDesc: { ...typography.bodySmall, marginBottom: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  rarity: { ...typography.label },
  points: { ...typography.bodySmall },
  progressWrap: { marginTop: spacing.xs },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { ...typography.label },
  unlockedOn: { ...typography.bodySmall, marginTop: spacing.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, marginTop: spacing.md },
});
