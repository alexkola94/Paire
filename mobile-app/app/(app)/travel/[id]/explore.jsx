/**
 * Trip Explore Screen (React Native)
 * POI discovery for trip destination.
 * Shows nearby places, attractions, restaurants, etc.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  MapPin,
  Coffee,
  UtensilsCrossed,
  Landmark,
  ShoppingBag,
  TreePine,
  Building,
  Heart,
  Star,
  ExternalLink,
} from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';

// POI category configuration
const POI_CATEGORIES = [
  { id: 'all', labelKey: 'travel.explore.categories.all', icon: MapPin },
  { id: 'attraction', labelKey: 'travel.explore.categories.attractions', icon: Landmark },
  { id: 'restaurant', labelKey: 'travel.explore.categories.restaurants', icon: UtensilsCrossed },
  { id: 'cafe', labelKey: 'travel.explore.categories.cafes', icon: Coffee },
  { id: 'shopping', labelKey: 'travel.explore.categories.shopping', icon: ShoppingBag },
  { id: 'nature', labelKey: 'travel.explore.categories.nature', icon: TreePine },
  { id: 'hotel', labelKey: 'travel.explore.categories.hotels', icon: Building },
];

// Get icon for POI type
function getPOIIcon(type) {
  const categoryMap = {
    attraction: Landmark,
    restaurant: UtensilsCrossed,
    cafe: Coffee,
    shopping: ShoppingBag,
    nature: TreePine,
    hotel: Building,
  };
  return categoryMap[type] || MapPin;
}

export default function TripExploreScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch trip details
  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  // Fetch saved places for this trip
  const { data: savedPlaces = [], refetch, isFetching } = useQuery({
    queryKey: ['travel-saved-places', id],
    queryFn: () => travelService.getSavedPlaces?.(id) || [],
    enabled: !!id,
  });

  // Filter places by category
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'all') return savedPlaces;
    return savedPlaces.filter((place) => place.type === selectedCategory);
  }, [savedPlaces, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Open place in maps
  const openInMaps = useCallback((place) => {
    if (place.lat && place.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
      Linking.openURL(url).catch(() => {});
    } else if (place.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  // Render category chip
  const renderCategory = ({ item }) => {
    const IconComponent = item.icon;
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.glassBorder,
          },
        ]}
        onPress={() => setSelectedCategory(item.id)}
        activeOpacity={0.7}
      >
        <IconComponent
          size={16}
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.categoryText,
            { color: isSelected ? theme.colors.primary : theme.colors.text },
          ]}
        >
          {t(item.labelKey, item.id)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render place card
  const renderPlace = ({ item }) => {
    const IconComponent = getPOIIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.placeCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
          shadows.sm,
        ]}
        onPress={() => openInMaps(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.placeIcon, { backgroundColor: theme.colors.primary + '15' }]}>
          <IconComponent size={20} color={theme.colors.primary} />
        </View>
        
        <View style={styles.placeContent}>
          <Text style={[styles.placeName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.address && (
            <Text style={[styles.placeAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.address}
            </Text>
          )}
          {item.rating && (
            <View style={styles.ratingRow}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.placeActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
            onPress={() => openInMaps(item)}
          >
            <ExternalLink size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (tripLoading || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('travel.explore.title', 'Explore')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {trip.destination || trip.name}
          </Text>
        </View>
      </View>

      {/* Category filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={POI_CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Places list */}
      <FlatList
        data={filteredPlaces}
        renderItem={renderPlace}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MapPin size={48} color={theme.colors.textLight} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {t('travel.explore.noPlaces', 'No places saved yet')}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('travel.explore.noPlacesHint', 'Save places from your trip to see them here')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  headerContent: { flex: 1 },
  title: { ...typography.h3 },
  subtitle: { ...typography.caption, marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Categories
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  categoriesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  categoryText: { ...typography.bodySmall, fontWeight: '500' },

  // List
  list: { padding: spacing.md, paddingBottom: 100 },

  // Place card
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeContent: { flex: 1 },
  placeName: { ...typography.body, fontWeight: '600' },
  placeAddress: { ...typography.bodySmall, marginTop: 2 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rating: { ...typography.caption },
  placeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: { ...typography.h3, marginTop: spacing.md },
  emptyText: { ...typography.body, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
});
