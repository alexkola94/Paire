import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { challengeService } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import { useTheme } from '../../context/ThemeContext';

const DIFFICULTY_COLORS = {
  easy: '#34D399',
  medium: '#FBBF24',
  hard: '#F87171',
};

const TYPE_LABELS = { daily: '☀️ Daily', weekly: '📅 Weekly', monthly: '📆 Monthly' };

function getChallengeEmoji(icon) {
  const map = {
    'clipboard-check': '📋', 'shield-check': '🛡️', 'ban': '🚫', 'trending-up': '📈',
    'zap': '⚡', 'tag': '🏷️', 'check-circle': '✅', 'heart': '💕',
  };
  return map[icon] || '🎯';
}

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);

  const { data: available = [], isLoading: loadingA } = useQuery({
    queryKey: ['challenges-available'],
    queryFn: () => challengeService.getAvailable(),
  });

  const { data: userChallenges = [], isLoading: loadingU, refetch } = useQuery({
    queryKey: ['user-challenges'],
    queryFn: () => challengeService.getUserChallenges(),
  });

  const joinMutation = useMutation({
    mutationFn: (id) => challengeService.join(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['user-challenges', 'active'] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: (id) => challengeService.claimReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
    },
  });

  const active = useMemo(() => userChallenges.filter(uc => uc.status === 'active'), [userChallenges]);
  const completed = useMemo(() => userChallenges.filter(uc => uc.status === 'completed'), [userChallenges]);
  const joinedIds = useMemo(() => new Set(active.map(uc => uc.challengeId)), [active]);
  const totalPts = useMemo(() => completed.reduce((s, uc) => s + (uc.challenge?.rewardPoints || 0), 0), [completed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isLoading = loadingA || loadingU;
  const textPrimary = theme.colors.text;
  const textSecondary = theme.colors.textSecondary;

  const tabs = [
    { id: 'active', label: t('challenges.active', { defaultValue: 'Active' }), count: active.length },
    { id: 'available', label: t('challenges.available', { defaultValue: 'Browse' }), count: available.length },
    { id: 'completed', label: t('challenges.completedTab', { defaultValue: 'Done' }), count: completed.length },
  ];

  const renderList = () => {
    if (tab === 'active') {
      if (active.length === 0) return <EmptyState emoji="🎯" text={t('challenges.noActive', { defaultValue: 'No active challenges' })} textColor={textSecondary} />;
      return active.map((uc, i) => (
        <ChallengeRow
          key={uc.id}
          uc={uc}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          onClaim={() => claimMutation.mutate(uc.id)}
          claimLoading={claimMutation.isPending}
          t={t}
        />
      ));
    }
    if (tab === 'available') {
      if (available.length === 0) return <EmptyState emoji="🏆" text={t('challenges.noneAvailable', { defaultValue: 'Check back soon!' })} textColor={textSecondary} />;
      return available.map((ch, i) => (
        <AvailableRow
          key={ch.id}
          ch={ch}
          isJoined={joinedIds.has(ch.id)}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          onJoin={() => joinMutation.mutate(ch.id)}
          joinLoading={joinMutation.isPending}
          t={t}
        />
      ));
    }
    if (completed.length === 0) return <EmptyState emoji="🌟" text={t('challenges.noneCompleted', { defaultValue: 'Complete a challenge!' })} textColor={textSecondary} />;
    return completed.map((uc, i) => (
      <ChallengeRow key={uc.id} uc={uc} textPrimary={textPrimary} textSecondary={textSecondary} t={t} />
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('challenges.title', { defaultValue: 'Challenges' })} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FBBF24" />}
      >
        <View style={styles.statsRow}>
          <StatCard label={t('challenges.activeCount', { defaultValue: 'Active' })} value={active.length} valueColor="#FBBF24" textSecondary={textSecondary} />
          <StatCard label={t('challenges.completedCount', { defaultValue: 'Done' })} value={completed.length} valueColor="#10B981" textSecondary={textSecondary} />
          <StatCard label={t('challenges.pointsEarned', { defaultValue: 'Points' })} value={totalPts} valueColor="#C4B5FD" textSecondary={textSecondary} />
        </View>

        <View style={styles.tabRow}>
          {tabs.map(tb => (
            <TouchableOpacity
              key={tb.id}
              style={[
                styles.tab,
                { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder },
                tab === tb.id && styles.tabActive,
              ]}
              onPress={() => setTab(tb.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: theme.colors.textSecondary },
                tab === tb.id && styles.tabTextActive,
              ]}>
                {tb.label} ({tb.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderList()}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, valueColor, textSecondary }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: textSecondary }]}>{label}</Text>
    </View>
  );
}

function ChallengeRow({ uc, textPrimary, textSecondary, onClaim, claimLoading, t }) {
  const { theme } = useTheme();
  const ch = uc.challenge || {};
  const diffColor = DIFFICULTY_COLORS[ch.difficulty] || DIFFICULTY_COLORS.medium;
  const progress = uc.progress || 0;
  const isCompleted = uc.status === 'completed';

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}44` }]}>
          <Text style={styles.emoji}>{getChallengeEmoji(ch.icon)}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: textPrimary }]}>{ch.name}</Text>
          <Text style={[styles.cardDesc, { color: textSecondary }]} numberOfLines={2}>{ch.description}</Text>
        </View>
        <View style={[styles.pointsBadge]}>
          <Text style={styles.pointsText}>⭐ {ch.rewardPoints}</Text>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <View style={[styles.progressFill, {
          width: `${Math.min(progress, 100)}%`,
          backgroundColor: isCompleted ? '#10B981' : diffColor,
        }]} />
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.progressText, { color: textSecondary }]}>
          {isCompleted ? (t('challenges.completed', { defaultValue: 'Completed!' })) : `${Math.round(progress)}%`}
        </Text>
        {isCompleted && !uc.rewardClaimed && onClaim && (
          <TouchableOpacity style={styles.claimBtn} onPress={onClaim} disabled={claimLoading} activeOpacity={0.7}>
            <Text style={styles.claimBtnText}>🎁 {t('challenges.claimReward', { defaultValue: 'Claim' })}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function AvailableRow({ ch, isJoined, textPrimary, textSecondary, onJoin, joinLoading, t }) {
  const { theme } = useTheme();
  const diffColor = DIFFICULTY_COLORS[ch.difficulty] || DIFFICULTY_COLORS.medium;
  const typeLabel = TYPE_LABELS[ch.challengeType] || TYPE_LABELS.weekly;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}44` }]}>
          <Text style={styles.emoji}>{getChallengeEmoji(ch.icon)}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: textPrimary }]}>{ch.name}</Text>
          <Text style={[styles.cardDesc, { color: textSecondary }]} numberOfLines={2}>{ch.description}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.smallBadge, { backgroundColor: `${diffColor}18` }]}>
              <Text style={[styles.smallBadgeText, { color: diffColor }]}>{ch.difficulty}</Text>
            </View>
            <View style={[styles.smallBadge, { backgroundColor: theme.colors.glassBg }]}>
              <Text style={[styles.smallBadgeText, { color: textSecondary }]}>{typeLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⭐ {ch.rewardPoints}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        {isJoined ? (
          <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>
            ✓ {t('challenges.joined', { defaultValue: 'Joined' })}
          </Text>
        ) : (
          <TouchableOpacity style={styles.joinBtn} onPress={onJoin} disabled={joinLoading} activeOpacity={0.7}>
            <Text style={styles.joinBtnText}>🎯 {t('challenges.join', { defaultValue: 'Join' })}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function EmptyState({ emoji, text, textColor }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={[styles.emptyText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1,
  },
  tabActive: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FBBF24' },
  card: {
    padding: 16, borderRadius: 16, borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  smallBadgeText: { fontSize: 11, fontWeight: '600' },
  pointsBadge: {
    backgroundColor: 'rgba(251,191,36,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pointsText: { fontSize: 11, fontWeight: '700', color: '#FBBF24' },
  progressTrack: {
    height: 5, borderRadius: 3, overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 12, fontWeight: '600' },
  claimBtn: {
    backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  claimBtnText: { color: '#10B981', fontWeight: '700', fontSize: 13 },
  joinBtn: {
    backgroundColor: 'rgba(251,191,36,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  joinBtnText: { color: '#FBBF24', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
