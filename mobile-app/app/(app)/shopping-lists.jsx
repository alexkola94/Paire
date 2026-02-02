/**
 * Shopping Lists Screen (React Native)
 * Full CRUD functionality for shopping list management.
 * 
 * Features:
 * - List shopping lists with item counts
 * - Pull-to-refresh
 * - Create new list via header Add button
 * - Edit list on tap
 * - Delete list with confirmation
 * - Expand to see/manage items
 * - Theme-aware styling
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  ShoppingCart,
} from 'lucide-react-native';
import { impactMedium, impactLight, notificationSuccess, notificationWarning } from '../../utils/haptics';
import { shoppingListService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  ConfirmationModal,
  ShoppingListForm,
  ShoppingItemForm,
  EmptyState,
  ScreenLoading,
  useToast,
} from '../../components';

export default function ShoppingListsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivate } = usePrivacyMode();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedListId, setExpandedListId] = useState(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemListId, setItemListId] = useState(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);

  const rowRefs = useRef({});

  // Fetch shopping lists
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => shoppingListService.getAll(),
  });

  // Create list mutation
  const createMutation = useMutation({
    mutationFn: (newList) => shoppingListService.create(newList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      notificationSuccess();
      showToast(t('shoppingLists.createSuccess', 'List created successfully'), 'success');
      setIsFormOpen(false);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update list mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => shoppingListService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      showToast(t('shoppingLists.updateSuccess', 'List updated successfully'), 'success');
      setEditingList(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => shoppingListService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      showToast(t('shoppingLists.deleteSuccess', 'List deleted successfully'), 'success');
      setDeleteTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: ({ listId, item }) => shoppingListService.addItem(listId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      showToast(t('shoppingLists.itemAdded', 'Item added'), 'success');
      setIsItemFormOpen(false);
      setItemListId(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ listId, itemId, item }) => shoppingListService.updateItem(listId, itemId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      showToast(t('shoppingLists.itemUpdated', 'Item updated'), 'success');
      setEditingItem(null);
      setItemListId(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: ({ listId, itemId }) => shoppingListService.deleteItem(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      showToast(t('shoppingLists.itemDeleted', 'Item deleted'), 'success');
      setDeleteItemTarget(null);
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Toggle item checked mutation
  const toggleItemMutation = useMutation({
    mutationFn: ({ listId, itemId }) => shoppingListService.toggleItem(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
    onError: (error) => {
      showToast(error.message || t('common.error', 'An error occurred'), 'error');
    },
  });

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : [];

  // Handle list form submission
  const handleListFormSubmit = async (formData) => {
    if (editingList) {
      await updateMutation.mutateAsync({ id: editingList.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  // Handle item form submission
  const handleItemFormSubmit = async (formData) => {
    if (editingItem) {
      await updateItemMutation.mutateAsync({
        listId: itemListId,
        itemId: editingItem.id,
        item: formData,
      });
    } else {
      await addItemMutation.mutateAsync({ listId: itemListId, item: formData });
    }
  };

  // Handle edit list
  const handleEditList = (item) => {
    setEditingList(item);
  };

  // Handle delete list
  const handleDeleteListConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
    }
  };

  // Handle delete item
  const handleDeleteItemConfirm = async () => {
    if (deleteItemTarget) {
      await deleteItemMutation.mutateAsync({
        listId: deleteItemTarget.listId,
        itemId: deleteItemTarget.itemId,
      });
    }
  };

  // Close list form
  const closeListForm = () => {
    setIsFormOpen(false);
    setEditingList(null);
  };

  // Close item form
  const closeItemForm = () => {
    setIsItemFormOpen(false);
    setEditingItem(null);
    setItemListId(null);
  };

  // Toggle expand
  const toggleExpand = (listId) => {
    setExpandedListId(expandedListId === listId ? null : listId);
  };

  // Add item to list
  const handleAddItem = (listId) => {
    setItemListId(listId);
    setIsItemFormOpen(true);
  };

  // Edit item
  const handleEditItem = (listId, item) => {
    setItemListId(listId);
    setEditingItem(item);
  };

  // Toggle item checked
  const handleToggleItem = (listId, itemId) => {
    toggleItemMutation.mutate({ listId, itemId });
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return '';
    if (isPrivate) return '••••';
    return `€${price.toFixed(2)}`;
  };

  // Close other rows when one opens
  const handleSwipeableWillOpen = useCallback((itemId) => {
    Object.keys(rowRefs.current).forEach((id) => {
      if (id !== String(itemId)) rowRefs.current[id]?.close();
    });
  }, []);

  const renderSwipeLeftActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: theme.colors.primary }]}>
        <Pencil size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.edit', 'Edit')}</Text>
      </View>
    ),
    [theme.colors.primary, t]
  );

  const renderSwipeRightActions = useCallback(
    () => (
      <View style={[styles.swipeAction, styles.swipeActionRight, { backgroundColor: theme.colors.error }]}>
        <Trash2 size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{t('common.delete', 'Delete')}</Text>
      </View>
    ),
    [theme.colors.error, t]
  );

  // Render list item
  const renderItem = ({ item: list }) => {
    const isExpanded = expandedListId === list.id;
    const listItems = list.items || [];
    const checkedCount = listItems.filter(i => i.isChecked || i.isPurchased).length;
    const totalEstimate = listItems.reduce((sum, i) => sum + ((i.estimatedPrice || 0) * (i.quantity || 1)), 0);

    return (
      <Swipeable
        ref={(r) => { rowRefs.current[list.id] = r; }}
        renderLeftActions={renderSwipeLeftActions}
        renderRightActions={renderSwipeRightActions}
        onSwipeableLeftOpen={() => {
          handleEditList(list);
          setTimeout(() => rowRefs.current[list.id]?.close(), 200);
        }}
        onSwipeableRightOpen={() => {
          setDeleteTarget(list);
          setTimeout(() => rowRefs.current[list.id]?.close(), 200);
        }}
        onSwipeableWillOpen={() => handleSwipeableWillOpen(list.id)}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
      <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        {/* List Header */}
        <TouchableOpacity
          style={styles.listHeader}
          onPress={() => toggleExpand(list.id)}
          onLongPress={() => setDeleteTarget(list)}
          activeOpacity={0.7}
        >
          <ShoppingCart size={24} color={theme.colors.primary} style={styles.listIcon} />
          
          <View style={styles.listInfo}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {list.name}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {checkedCount}/{listItems.length} {t('shoppingLists.items', 'items')}
              {totalEstimate > 0 && ` • ${formatPrice(totalEstimate)}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {isExpanded ? (
              <ChevronUp size={20} color={theme.colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Items */}
        {isExpanded && (
          <View style={styles.itemsContainer}>
            {listItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => handleToggleItem(list.id, item.id)}
                onLongPress={() => setDeleteItemTarget({ listId: list.id, itemId: item.id })}
                activeOpacity={0.7}
              >
                {item.isChecked || item.isPurchased ? (
                  <CheckCircle size={20} color={theme.colors.success} />
                ) : (
                  <Circle size={20} color={theme.colors.textLight} />
                )}
                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      { color: theme.colors.text },
                      (item.isChecked || item.isPurchased) && styles.itemChecked,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.textSecondary }]}>
                    {item.quantity || 1} {item.unit || 'pcs'}
                    {item.estimatedPrice > 0 && ` • ${formatPrice(item.estimatedPrice)}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.itemEditBtn}
                  onPress={() => handleEditItem(list.id, item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Pencil size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Add Item Button */}
            <TouchableOpacity
              style={[styles.addItemBtn, { borderColor: theme.colors.glassBorder }]}
              onPress={() => handleAddItem(list.id)}
              activeOpacity={0.7}
            >
              <Plus size={18} color={theme.colors.primary} />
              <Text style={[styles.addItemText, { color: theme.colors.primary }]}>
                {t('shoppingLists.addItem', 'Add Item')}
              </Text>
            </TouchableOpacity>

            {/* List Actions */}
            <View style={styles.listActions}>
              <TouchableOpacity
                style={[styles.listActionBtn, { backgroundColor: `${theme.colors.primary}15` }]}
                onPress={() => handleEditList(list)}
                activeOpacity={0.7}
              >
                <Pencil size={16} color={theme.colors.primary} />
                <Text style={[styles.listActionText, { color: theme.colors.primary }]}>
                  {t('common.edit', 'Edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.listActionBtn, { backgroundColor: `${theme.colors.error}15` }]}
                onPress={() => setDeleteTarget(list)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={theme.colors.error} />
                <Text style={[styles.listActionText, { color: theme.colors.error }]}>
                  {t('common.delete', 'Delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      </Swipeable>
    );
  };

  const isListSubmitting = createMutation.isPending || updateMutation.isPending;
  const isItemSubmitting = addItemMutation.isPending || updateItemMutation.isPending;

  // Show loading on first fetch so we don't flash empty state (after all hooks to satisfy Rules of Hooks)
  if (isLoading && (data === undefined || data === null)) {
    return <ScreenLoading />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header: title + Add button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('shoppingLists.title', 'Shopping Lists')}
        </Text>
        <TouchableOpacity
          onPress={() => setIsFormOpen(true)}
          style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          accessibilityLabel={t('shoppingLists.addNew', 'Add new list')}
          accessibilityRole="button"
        >
          <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={ShoppingCart}
            title={t('shoppingLists.emptyTitle', 'No shopping lists yet')}
            description={t('shoppingLists.emptyDescription', 'Create a shared shopping list to plan your purchases together.')}
            ctaLabel={t('shoppingLists.addFirst', 'Create List')}
            onPress={() => setIsFormOpen(true)}
          />
        }
      />

      {/* Create/Edit List Modal */}
      <Modal
        isOpen={isFormOpen || editingList !== null}
        onClose={closeListForm}
        title={editingList
          ? t('shoppingLists.editTitle', 'Edit List')
          : t('shoppingLists.addTitle', 'New List')}
      >
        <ShoppingListForm
          list={editingList}
          onSubmit={handleListFormSubmit}
          onCancel={closeListForm}
          loading={isListSubmitting}
        />
      </Modal>

      {/* Create/Edit Item Modal */}
      <Modal
        isOpen={isItemFormOpen || editingItem !== null}
        onClose={closeItemForm}
        title={editingItem
          ? t('shoppingLists.editItem', 'Edit Item')
          : t('shoppingLists.addItem', 'Add Item')}
      >
        <ShoppingItemForm
          item={editingItem}
          onSubmit={handleItemFormSubmit}
          onCancel={closeItemForm}
          loading={isItemSubmitting}
        />
      </Modal>

      {/* Delete List Confirmation */}
      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteListConfirm}
        title={t('shoppingLists.deleteTitle', 'Delete List')}
        message={t('shoppingLists.deleteMessage', 'Are you sure you want to delete this shopping list and all its items?')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Delete Item Confirmation */}
      <ConfirmationModal
        isOpen={deleteItemTarget !== null}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={handleDeleteItemConfirm}
        title={t('shoppingLists.deleteItemTitle', 'Delete Item')}
        message={t('shoppingLists.deleteItemMessage', 'Are you sure you want to delete this item?')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="danger"
        loading={deleteItemMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    flex: 1,
  },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 100, // Clear floating tab bar
  },
  card: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  listIcon: {
    marginRight: spacing.sm,
  },
  listInfo: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardSub: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  headerActions: {
    marginLeft: spacing.sm,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  itemMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  itemEditBtn: {
    padding: spacing.xs,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  addItemText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  listActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  listActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  listActionText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  swipeActionRight: {
    marginLeft: spacing.sm,
  },
  swipeActionLeft: {
    marginRight: spacing.sm,
  },
  swipeActionText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  empty: {
    textAlign: 'center',
    ...typography.body,
  },
});
