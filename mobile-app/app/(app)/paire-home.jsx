/**
 * Paire Home – room grid, levels, progress, locked/unlocked
 */

import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { ScreenHeader } from '../../components/navigation';
import { paireHomeService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../constants/theme';

const ROOM_EMOJI = {
  kitchen: '🍳',
  living_room: '🛋️',
  bedroom: '🛏️',
  office: '💼',
  garden: '🌿',
  garage: '🚗',
  bathroom: '🚿',
};

function formatRoomName(key) {
  return (key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderStars(level) {
  const stars = Math.min(4, Math.max(0, level));
  return '★'.repeat(stars) + '☆'.repeat(4 - stars);
}

export default function PaireHomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    data: homeData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['paire-home'],
    queryFn: () => paireHomeService.getHome(),
  });

  const {
    data: roomsData,
    isLoading: roomsLoading,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ['paire-home-rooms'],
    queryFn: () => paireHomeService.getRooms(),
  });

  const homeLevel = homeData?.level ?? homeData?.Level ?? 1;
  const homeName = homeData?.homeName ?? homeData?.HomeName ?? 'Love Nest';
  const rooms = Array.isArray(roomsData) ? roomsData : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Paire Home" showMenuButton onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => {
              refetch();
              refetchRooms();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Home level header */}
        <View style={[styles.headerCard, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
          <Text style={[styles.homeName, { color: theme.colors.text }]}>
            {homeName}
          </Text>
          <Text style={[styles.homeLevel, { color: colors.primary }]}>
            Level {homeLevel}
          </Text>
        </View>

        {/* Room grid (2 columns) */}
        <View style={styles.grid}>
          {rooms.map((room) => {
            const isUnlocked = room.isUnlocked ?? room.IsUnlocked ?? false;
            const level = room.level ?? room.Level ?? 0;
            const points = room.points ?? room.Points ?? 0;
            const pointsToNext = room.pointsToNextLevel ?? room.PointsToNextLevel;
            const name = room.name ?? room.Name ?? '';
            const emoji = ROOM_EMOJI[name] ?? '🏠';
            const progress =
              pointsToNext != null && pointsToNext > 0
                ? Math.min(1, points / (points + pointsToNext))
                : 1;

            return (
              <View
                key={name}
                style={[
                  styles.roomCard,
                  {
                    backgroundColor: isUnlocked ? theme.colors.glassBg : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.glassBorder,
                    opacity: isUnlocked ? 1 : 0.7,
                  },
                ]}
              >
                <View style={styles.roomHeader}>
                  <Text style={styles.roomEmoji}>{emoji}</Text>
                  {!isUnlocked && (
                    <Lock size={14} color={theme.colors.textLight} />
                  )}
                </View>
                <Text style={[styles.roomName, { color: theme.colors.text }]}>
                  {formatRoomName(name)}
                </Text>
                <Text style={[styles.roomStars, { color: colors.warning }]}>
                  {renderStars(level)}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: theme.colors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, progress * 100)}%`,
                        backgroundColor: isUnlocked ? colors.primary : theme.colors.textLight,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.roomStatus, { color: theme.colors.textSecondary }]}>
                  {isUnlocked
                    ? pointsToNext != null
                      ? `${pointsToNext} to next level`
                      : 'Max level'
                    : 'Locked'}
                </Text>
              </View>
            );
          })}
        </View>

        {rooms.length === 0 && !roomsLoading && (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.glassBg }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No rooms yet. Log expenses to unlock and level up your home!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.tabBarBottomClearance },
  headerCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  homeName: { fontSize: 20, fontWeight: '700' },
  homeLevel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  roomCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomEmoji: { fontSize: 28 },
  roomName: { fontSize: 14, fontWeight: '600' },
  roomStars: { fontSize: 12, marginTop: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  roomStatus: { fontSize: 11, marginTop: 4 },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
});
