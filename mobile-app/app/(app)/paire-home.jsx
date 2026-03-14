/**
 * Paire Home – visual house, rooms, furniture, themes & upgrades
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ArrowUp, X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components/navigation';
import { paireHomeService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_W = (SCREEN_W - spacing.lg * 2 - CARD_GAP) / 2;

const ROOM_EMOJI = {
  kitchen: '🍳',
  living_room: '🛋️',
  bedroom: '🛏️',
  office: '💼',
  garden: '🌿',
  garage: '🚗',
  bathroom: '🚿',
};

const FURNITURE_CATALOG = {
  kitchen: [
    { code: 'stove', emoji: '🔥', label: 'Stove' },
    { code: 'fridge', emoji: '❄️', label: 'Fridge' },
    { code: 'table', emoji: '🪑', label: 'Table' },
    { code: 'plant', emoji: '🌱', label: 'Plant' },
    { code: 'chandelier', emoji: '💡', label: 'Chandelier' },
  ],
  living_room: [
    { code: 'sofa', emoji: '🛋️', label: 'Sofa' },
    { code: 'tv', emoji: '📺', label: 'TV' },
    { code: 'bookshelf', emoji: '📚', label: 'Bookshelf' },
    { code: 'rug', emoji: '🟫', label: 'Rug' },
    { code: 'lamp', emoji: '💡', label: 'Lamp' },
  ],
  bedroom: [
    { code: 'bed', emoji: '🛏️', label: 'Bed' },
    { code: 'wardrobe', emoji: '👔', label: 'Wardrobe' },
    { code: 'nightstand', emoji: '🪑', label: 'Nightstand' },
    { code: 'mirror', emoji: '🪞', label: 'Mirror' },
    { code: 'curtains', emoji: '🪟', label: 'Curtains' },
  ],
  office: [
    { code: 'desk', emoji: '🖥️', label: 'Desk' },
    { code: 'chair', emoji: '💺', label: 'Chair' },
    { code: 'monitor', emoji: '🖥️', label: 'Monitor' },
    { code: 'bookcase', emoji: '📚', label: 'Bookcase' },
    { code: 'whiteboard', emoji: '📋', label: 'Whiteboard' },
  ],
  garden: [
    { code: 'bench', emoji: '🪑', label: 'Bench' },
    { code: 'fountain', emoji: '⛲', label: 'Fountain' },
    { code: 'tree', emoji: '🌳', label: 'Tree' },
    { code: 'flowers', emoji: '🌸', label: 'Flowers' },
    { code: 'grill', emoji: '🔥', label: 'Grill' },
  ],
  garage: [
    { code: 'car', emoji: '🚗', label: 'Car' },
    { code: 'toolbox', emoji: '🔧', label: 'Toolbox' },
    { code: 'bike', emoji: '🚲', label: 'Bike' },
    { code: 'shelving', emoji: '📦', label: 'Shelving' },
    { code: 'workbench', emoji: '🔨', label: 'Workbench' },
  ],
  bathroom: [
    { code: 'bathtub', emoji: '🛁', label: 'Bathtub' },
    { code: 'vanity', emoji: '🪞', label: 'Vanity' },
    { code: 'towelrack', emoji: '🧺', label: 'Towel Rack' },
    { code: 'plants', emoji: '🪴', label: 'Plants' },
    { code: 'tiles', emoji: '🟦', label: 'Tiles' },
  ],
};

const SEASONAL_THEMES = [
  { key: 'default', color: '#8B5CF6', label: 'Default' },
  { key: 'spring', color: '#10B981', label: 'Spring' },
  { key: 'summer', color: '#F59E0B', label: 'Summer' },
  { key: 'autumn', color: '#F97316', label: 'Autumn' },
  { key: 'winter', color: '#3B82F6', label: 'Winter' },
  { key: 'holiday', color: '#EF4444', label: 'Holiday' },
];

function formatRoomName(key) {
  return (key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function val(obj, ...keys) {
  for (const k of keys) {
    if (obj?.[k] != null) return obj[k];
  }
  return undefined;
}

export default function PaireHomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ---- Queries ----
  const { data: homeData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['paire-home'],
    queryFn: () => paireHomeService.getHome(),
  });

  const { data: roomsData, refetch: refetchRooms } = useQuery({
    queryKey: ['paire-home-rooms'],
    queryFn: () => paireHomeService.getRooms(),
  });

  const { data: furnitureData, refetch: refetchFurniture } = useQuery({
    queryKey: ['paire-home-furniture'],
    queryFn: () => paireHomeService.getFurniture(),
  });

  // ---- Mutations ----
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['paire-home'] });
    queryClient.invalidateQueries({ queryKey: ['paire-home-rooms'] });
    queryClient.invalidateQueries({ queryKey: ['paire-home-furniture'] });
  }, [queryClient]);

  const upgradeMutation = useMutation({
    mutationFn: (room) => paireHomeService.upgradeRoom(room),
    onSuccess: invalidateAll,
  });

  const equipMutation = useMutation({
    mutationFn: ({ room, furnitureCode, equip }) =>
      paireHomeService.equipFurniture(room, furnitureCode, equip),
    onSuccess: invalidateAll,
  });

  const themeMutation = useMutation({
    mutationFn: (themeKey) => paireHomeService.setTheme(themeKey),
    onSuccess: invalidateAll,
  });

  // ---- Derived data ----
  const homeLevel = val(homeData, 'level', 'Level') ?? 1;
  const totalPoints = val(homeData, 'totalPoints', 'TotalPoints') ?? 0;
  const activeTheme = val(homeData, 'theme', 'Theme') ?? 'default';
  const rooms = useMemo(() => (Array.isArray(roomsData) ? roomsData : []), [roomsData]);

  const furnitureMap = useMemo(() => {
    if (!furnitureData) return {};
    const arr = Array.isArray(furnitureData) ? furnitureData : [];
    const map = {};
    arr.forEach((f) => {
      const room = val(f, 'room', 'Room') ?? '';
      if (!map[room]) map[room] = [];
      map[room].push(f);
    });
    return map;
  }, [furnitureData]);

  const unlockedCount = rooms.filter((r) => val(r, 'isUnlocked', 'IsUnlocked')).length;

  const openFurnitureModal = useCallback((roomName) => {
    setSelectedRoom(roomName);
    setModalVisible(true);
  }, []);

  const closeFurnitureModal = useCallback(() => {
    setModalVisible(false);
    setSelectedRoom(null);
  }, []);

  const onRefresh = useCallback(() => {
    refetch();
    refetchRooms();
    refetchFurniture();
  }, [refetch, refetchRooms, refetchFurniture]);

  const isFurnitureEquipped = useCallback(
    (roomName, code) => {
      const items = furnitureMap[roomName] || [];
      return items.some(
        (f) =>
          (val(f, 'furnitureCode', 'FurnitureCode') === code) &&
          val(f, 'isEquipped', 'IsEquipped'),
      );
    },
    [furnitureMap],
  );

  const isFurnitureUnlocked = useCallback(
    (roomName, code) => {
      const items = furnitureMap[roomName] || [];
      const match = items.find((f) => val(f, 'furnitureCode', 'FurnitureCode') === code);
      return match ? val(match, 'isUnlocked', 'IsUnlocked') ?? false : false;
    },
    [furnitureMap],
  );

  const getFurniturePointsNeeded = useCallback(
    (roomName, code) => {
      const items = furnitureMap[roomName] || [];
      const match = items.find((f) => val(f, 'furnitureCode', 'FurnitureCode') === code);
      return match ? val(match, 'pointsNeeded', 'PointsNeeded') ?? 0 : 0;
    },
    [furnitureMap],
  );

  const getEquippedEmojis = useCallback(
    (roomName) => {
      const items = furnitureMap[roomName] || [];
      const catalog = FURNITURE_CATALOG[roomName] || [];
      return items
        .filter((f) => val(f, 'isEquipped', 'IsEquipped'))
        .map((f) => {
          const code = val(f, 'furnitureCode', 'FurnitureCode');
          return catalog.find((c) => c.code === code)?.emoji;
        })
        .filter(Boolean);
    },
    [furnitureMap],
  );

  // ---- Selected room data for modal ----
  const modalRoom = useMemo(() => {
    if (!selectedRoom) return null;
    return rooms.find((r) => (val(r, 'name', 'Name') ?? '') === selectedRoom) || null;
  }, [selectedRoom, rooms]);

  const modalCatalog = selectedRoom ? FURNITURE_CATALOG[selectedRoom] || [] : [];
  const modalRoomUnlocked = modalRoom
    ? val(modalRoom, 'isUnlocked', 'IsUnlocked') ?? false
    : false;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <ScreenHeader title={t('paireHome.title', 'Paire Home')} showMenuButton onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Stats header ── */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: theme.colors.glassBg,
              borderColor: theme.colors.glassBorder,
            },
            shadows.md,
          ]}
        >
          <StatBadge
            emoji="🏠"
            label={t('paireHome.level', 'Level')}
            value={homeLevel}
            color={theme.colors.primary}
            textColor={theme.colors.text}
            secondaryColor={theme.colors.textSecondary}
          />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.glassBorder }]} />
          <StatBadge
            emoji="⭐"
            label={t('paireHome.points', 'Points')}
            value={totalPoints.toLocaleString()}
            color="#F59E0B"
            textColor={theme.colors.text}
            secondaryColor={theme.colors.textSecondary}
          />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.glassBorder }]} />
          <StatBadge
            emoji="🔓"
            label={t('paireHome.rooms', 'Rooms')}
            value={`${unlockedCount}/${rooms.length || 7}`}
            color={theme.colors.success}
            textColor={theme.colors.text}
            secondaryColor={theme.colors.textSecondary}
          />
        </View>

        {/* ── Seasonal theme selector ── */}
        <View style={styles.themeSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('paireHome.seasonalTheme', 'Seasonal Theme')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeRow}
          >
            {SEASONAL_THEMES.map((st) => {
              const isActive = activeTheme === st.key;
              return (
                <TouchableOpacity
                  key={st.key}
                  onPress={() => themeMutation.mutate(st.key)}
                  activeOpacity={0.7}
                  style={styles.themeItem}
                >
                  <View
                    style={[
                      styles.themeDot,
                      { backgroundColor: st.color },
                      isActive && styles.themeDotActive,
                      isActive && { borderColor: theme.colors.text },
                    ]}
                  >
                    {isActive && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isActive ? theme.colors.text : theme.colors.textSecondary },
                      isActive && { fontWeight: '700' },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Room grid ── */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.md }]}>
          {t('paireHome.yourRooms', 'Your Rooms')}
        </Text>

        <View style={styles.grid}>
          {rooms.map((room) => {
            const isUnlocked = val(room, 'isUnlocked', 'IsUnlocked') ?? false;
            const level = val(room, 'level', 'Level') ?? 0;
            const points = val(room, 'points', 'Points') ?? 0;
            const pointsToNext = val(room, 'pointsToNextLevel', 'PointsToNextLevel');
            const name = val(room, 'name', 'Name') ?? '';
            const emoji = ROOM_EMOJI[name] ?? '🏠';
            const progress =
              pointsToNext != null && pointsToNext > 0
                ? Math.min(1, points / (points + pointsToNext))
                : 1;
            const equipped = getEquippedEmojis(name);

            return (
              <TouchableOpacity
                key={name}
                activeOpacity={isUnlocked ? 0.7 : 1}
                onPress={() => isUnlocked && openFurnitureModal(name)}
                style={[
                  styles.roomCard,
                  {
                    backgroundColor: isUnlocked
                      ? theme.colors.glassBg
                      : theme.colors.surfaceSecondary,
                    borderColor: theme.colors.glassBorder,
                    opacity: isUnlocked ? 1 : 0.55,
                  },
                  shadows.sm,
                ]}
              >
                <View style={styles.roomTopRow}>
                  <Text style={styles.roomEmoji}>{emoji}</Text>
                  {!isUnlocked && <Lock size={16} color={theme.colors.textLight} />}
                  {isUnlocked && (
                    <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '22' }]}>
                      <Text style={[styles.levelBadgeText, { color: theme.colors.primary }]}>
                        Lv.{level}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.roomName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {formatRoomName(name)}
                </Text>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: theme.colors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, progress * 100)}%`,
                        backgroundColor: isUnlocked ? theme.colors.primary : theme.colors.textLight,
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
                  {isUnlocked
                    ? pointsToNext != null
                      ? `${pointsToNext} pts to next`
                      : 'Max level ✨'
                    : '🔒 Locked'}
                </Text>

                {/* Equipped furniture emojis */}
                {equipped.length > 0 && (
                  <View style={styles.equippedRow}>
                    {equipped.map((em, i) => (
                      <Text key={i} style={styles.equippedEmoji}>
                        {em}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Upgrade button */}
                {isUnlocked && pointsToNext != null && (
                  <TouchableOpacity
                    style={[styles.upgradeBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      upgradeMutation.mutate(name);
                    }}
                    activeOpacity={0.8}
                    disabled={upgradeMutation.isPending}
                  >
                    <ArrowUp size={12} color="#fff" />
                    <Text style={styles.upgradeBtnText}>
                      {t('paireHome.upgrade', 'Upgrade')}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {rooms.length === 0 && !isLoading && (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
            <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>🏡</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('paireHome.empty', 'No rooms yet. Log expenses to unlock and level up your home!')}
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Furniture modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeFurnitureModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Pressable style={styles.modalDismiss} onPress={closeFurnitureModal} />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.glassBorder,
              },
            ]}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={{ fontSize: 28 }}>
                  {selectedRoom ? ROOM_EMOJI[selectedRoom] ?? '🏠' : '🏠'}
                </Text>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {formatRoomName(selectedRoom ?? '')}
                </Text>
              </View>
              <TouchableOpacity onPress={closeFurnitureModal} activeOpacity={0.7}>
                <View
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder },
                  ]}
                >
                  <X size={18} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Modal subtitle */}
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {t('paireHome.tapToEquip', 'Tap an item to equip or unequip it.')}
            </Text>

            {/* Furniture catalog */}
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {modalCatalog.map((item) => {
                const unlocked = isFurnitureUnlocked(selectedRoom, item.code);
                const equipped = isFurnitureEquipped(selectedRoom, item.code);
                const pointsNeeded = getFurniturePointsNeeded(selectedRoom, item.code);
                const isEquipping =
                  equipMutation.isPending &&
                  equipMutation.variables?.furnitureCode === item.code;

                return (
                  <TouchableOpacity
                    key={item.code}
                    activeOpacity={unlocked ? 0.7 : 1}
                    onPress={() => {
                      if (!unlocked || !modalRoomUnlocked) return;
                      equipMutation.mutate({
                        room: selectedRoom,
                        furnitureCode: item.code,
                        equip: !equipped,
                      });
                    }}
                    style={[
                      styles.furnitureRow,
                      {
                        backgroundColor: equipped
                          ? theme.colors.primary + '14'
                          : theme.colors.glassBg,
                        borderColor: equipped
                          ? theme.colors.primary + '44'
                          : theme.colors.glassBorder,
                        opacity: unlocked ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Text style={styles.furnitureEmoji}>{item.emoji}</Text>
                    <View style={styles.furnitureInfo}>
                      <Text style={[styles.furnitureName, { color: theme.colors.text }]}>
                        {item.label}
                      </Text>
                      {!unlocked && (
                        <Text style={[styles.furnitureLocked, { color: theme.colors.textLight }]}>
                          🔒 {pointsNeeded > 0 ? `${pointsNeeded} pts needed` : 'Locked'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.furnitureAction}>
                      {isEquipping ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : equipped ? (
                        <View style={[styles.equipBadge, { backgroundColor: theme.colors.primary }]}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      ) : unlocked ? (
                        <View
                          style={[
                            styles.equipBadge,
                            {
                              backgroundColor: 'transparent',
                              borderWidth: 2,
                              borderColor: theme.colors.glassBorder,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBadge({ emoji, label, value, color, textColor, secondaryColor }) {
  return (
    <View style={styles.statItem}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: secondaryColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.tabBarBottomClearance,
  },

  // Stats header
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 40, borderRadius: 1 },

  // Theme selector
  themeSection: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  themeItem: { alignItems: 'center', gap: 6 },
  themeDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDotActive: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
  },
  themeLabel: { fontSize: 11, fontWeight: '500' },

  // Room grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  roomCard: {
    width: CARD_W,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomEmoji: { fontSize: 30 },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
  roomName: { ...typography.label, marginBottom: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, marginTop: 4 },
  equippedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 6,
  },
  equippedEmoji: { fontSize: 14 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginTop: 8,
  },
  upgradeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Furniture modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '70%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalTitle: { ...typography.h2 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  modalScroll: { flex: 1 },
  modalScrollContent: { gap: spacing.sm, paddingBottom: spacing.md },
  furnitureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  furnitureEmoji: { fontSize: 28, marginRight: spacing.md },
  furnitureInfo: { flex: 1 },
  furnitureName: { ...typography.label },
  furnitureLocked: { fontSize: 11, marginTop: 2 },
  furnitureAction: { width: 28, alignItems: 'center' },
  equipBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
