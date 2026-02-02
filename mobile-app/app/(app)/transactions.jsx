/**
 * Transactions Screen (React Native)
 * Full CRUD: list with search, date range, pagination; add/edit/delete; detail modal.
 */

import { useState, useCallback, useMemo, Fragment } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, List, Clock, Calendar } from 'lucide-react-native';
import { transactionService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePrivacyMode } from '../../context/PrivacyModeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import {
  Modal,
  SearchInput,
  DateRangePicker,
  ConfirmationModal,
  TransactionForm,
  useToast,
} from '../../components';
import CalendarView from '../../components/CalendarView';

const PAGE_SIZE = 20;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = dateStr.split('T')[0];
    return new Date(d).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPrivacyMode } = usePrivacyMode();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Format amount with privacy mode support
  const formatAmount = (amount, isExpense) => {
    if (isPrivacyMode) return '••••';
    const prefix = isExpense ? '-' : '+';
    return `${prefix}€${Number(amount || 0).toFixed(2)}`;
  };

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' = all, 'expense', 'income'
  const [page, setPage] = useState(1);

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'timeline' | 'calendar'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['transactions', 'all', page, searchQuery, startDate, endDate, typeFilter],
    queryFn: () =>
      transactionService.getAll({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => transactionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.createSuccess', 'Transaction added'), 'success');
      setFormOpen(false);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => transactionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.updateSuccess', 'Transaction updated'), 'success');
      setEditingTransaction(null);
      setDetailTransaction(null);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('transactions.deleteSuccess', 'Transaction deleted'), 'success');
      setDeleteTarget(null);
      setDetailTransaction(null);
    },
    onError: (err) => showToast(err?.message || t('common.error', 'Error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items = Array.isArray(data) ? data : data?.items || [];
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages ?? 1);
  const totalCount = Array.isArray(data) ? data.length : (data?.totalCount ?? items.length);

  // Group items by date for timeline view (newest first)
  const timelineSections = useMemo(() => {
    const byDate = {};
    items.forEach((item) => {
      const key = (item.date || '').toString().split('T')[0] || '—';
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(item);
    });
    const keys = Object.keys(byDate).sort((a, b) => (b > a ? 1 : -1));
    return keys.map((key) => ({
      title: key === '—' ? '—' : formatDate(key),
      dateKey: key,
      data: byDate[key],
    }));
  }, [items]);

  // Filter items by selected calendar date
  const filteredByCalendarDate = useMemo(() => {
    if (!selectedCalendarDate || viewMode !== 'calendar') return items;
    return items.filter((item) => {
      const itemDate = (item.date || '').split('T')[0];
      return itemDate === selectedCalendarDate;
    });
  }, [items, selectedCalendarDate, viewMode]);

  // Handle calendar date selection
  const handleCalendarDateSelect = useCallback((dateKey) => {
    setSelectedCalendarDate((prev) => (prev === dateKey ? null : dateKey));
  }, []);

  const openEdit = (item) => {
    setDetailTransaction(null);
    setEditingTransaction(item);
  };

  const openDetail = (item) => {
    setEditingTransaction(null);
    setDetailTransaction(item);
  };

  const handleSubmit = (payload) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item }) => {
    const isExpense = item.type === 'expense';
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.glassBorder,
          },
          shadows.sm,
        ]}
        onPress={() => openDetail(item)}
        onLongPress={() => setDeleteTarget(item)}
        activeOpacity={0.8}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.description || item.category || '—'}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {item.category} • {formatDate(item.date)}
            </Text>
          </View>
          <Text style={[styles.cardAmount, { color: isExpense ? theme.colors.error : theme.colors.success }]}>
            {formatAmount(item.amount, isExpense)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTimelineItem = ({ item, index, section }) => {
    const isExpense = item.type === 'expense';
    const isLast = index === section.data.length - 1;
    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineLineCol}>
          <View style={[styles.timelineDot, { backgroundColor: isExpense ? theme.colors.error : theme.colors.success }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.colors.glassBorder }]} />}
        </View>
        <TouchableOpacity
          style={[
            styles.timelineCard,
            {
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.glassBorder,
            },
            shadows.sm,
          ]}
          onPress={() => openDetail(item)}
          onLongPress={() => setDeleteTarget(item)}
          activeOpacity={0.8}
        >
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.description || item.category || '—'}
              </Text>
              <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>{item.category}</Text>
            </View>
            <Text style={[styles.cardAmount, { color: isExpense ? theme.colors.error : theme.colors.success }]}>
              {formatAmount(item.amount, isExpense)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.timelineSectionHeader, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.timelineSectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('transactions.title')}</Text>

      {/* View mode toggle (List / Timeline / Calendar) */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[
            styles.viewToggleBtn,
            { borderColor: theme.colors.glassBorder, backgroundColor: viewMode === 'list' ? theme.colors.primary + '20' : theme.colors.surface },
          ]}
          onPress={() => { setViewMode('list'); setSelectedCalendarDate(null); }}
          activeOpacity={0.7}
        >
          <List size={16} color={viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.viewToggleText, { color: viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary }]}>
            {t('transactions.viewList', 'List')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleBtn,
            { borderColor: theme.colors.glassBorder, backgroundColor: viewMode === 'timeline' ? theme.colors.primary + '20' : theme.colors.surface },
          ]}
          onPress={() => { setViewMode('timeline'); setSelectedCalendarDate(null); }}
          activeOpacity={0.7}
        >
          <Clock size={16} color={viewMode === 'timeline' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.viewToggleText, { color: viewMode === 'timeline' ? theme.colors.primary : theme.colors.textSecondary }]}>
            {t('transactions.viewTimeline', 'Timeline')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleBtn,
            { borderColor: theme.colors.glassBorder, backgroundColor: viewMode === 'calendar' ? theme.colors.primary + '20' : theme.colors.surface },
          ]}
          onPress={() => setViewMode('calendar')}
          activeOpacity={0.7}
        >
          <Calendar size={16} color={viewMode === 'calendar' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.viewToggleText, { color: viewMode === 'calendar' ? theme.colors.primary : theme.colors.textSecondary }]}>
            {t('calendar.viewMode.calendar', 'Calendar')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type filter: All / Expense / Income */}
      <View style={[styles.typeFilterRow, { borderBottomColor: theme.colors.glassBorder }]}>
        {[
          { value: '', labelKey: 'transactions.filterAll', default: 'All' },
          { value: 'expense', labelKey: 'transactions.filterExpense', default: 'Expense' },
          { value: 'income', labelKey: 'transactions.filterIncome', default: 'Income' },
        ].map(({ value, labelKey, default: def }) => (
          <TouchableOpacity
            key={value || 'all'}
            style={[
              styles.typeFilterBtn,
              {
                backgroundColor: typeFilter === value ? theme.colors.primary + '20' : theme.colors.surface,
                borderColor: theme.colors.glassBorder,
              },
            ]}
            onPress={() => { setTypeFilter(value); setPage(1); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeFilterText, { color: typeFilter === value ? theme.colors.primary : theme.colors.textSecondary }]}>
              {t(labelKey, def)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters */}
      <View style={[styles.filters, { backgroundColor: theme.colors.background }]}>
        <SearchInput
          initialValue={searchQuery}
          onSearch={setSearchQuery}
          placeholder={t('transactions.searchPlaceholder', 'Search transactions...')}
          debounceMs={400}
        />
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          label={t('transactions.selectDateRange', 'Select date range')}
          showQuickPresets={true}
        />
      </View>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <ScrollView
          contentContainerStyle={styles.calendarContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isFetching}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          <CalendarView
            transactions={items}
            selectedDate={selectedCalendarDate}
            onSelectDate={handleCalendarDateSelect}
          />
          
          {/* Transactions for selected date */}
          {selectedCalendarDate && (
            <View style={styles.calendarTransactionsList}>
              <Text style={[styles.calendarDateTitle, { color: theme.colors.text }]}>
                {formatDate(selectedCalendarDate)}
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>
                  {' '}({filteredByCalendarDate.length} {filteredByCalendarDate.length === 1 ? 'transaction' : 'transactions'})
                </Text>
              </Text>
              {filteredByCalendarDate.length === 0 ? (
                <Text style={[styles.empty, { color: theme.colors.textLight, marginTop: spacing.md }]}>
                  {t('calendar.noTransactionsOnDay', 'No transactions on this day')}
                </Text>
              ) : (
                filteredByCalendarDate.map((item) => (
                  <Fragment key={String(item.id)}>
                    {renderItem({ item })}
                  </Fragment>
                ))
              )}
            </View>
          )}
          
          {/* Hint when no date selected */}
          {!selectedCalendarDate && (
            <Text style={[styles.calendarHint, { color: theme.colors.textSecondary }]}>
              {t('calendar.tapDayToFilter', 'Tap a day to see transactions')}
            </Text>
          )}
        </ScrollView>
      )}

      {viewMode === 'list' && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isFetching}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {t('common.noData')}
            </Text>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Text style={{ color: theme.colors.text }}>{t('common.previous', 'Previous')}</Text>
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: theme.colors.textSecondary }]}>
                  {t('transactions.pageInfo', 'Page {{page}} of {{total}}', {
                    page,
                    total: totalPages,
                  })}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Text style={{ color: theme.colors.text }}>{t('common.next', 'Next')}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {viewMode === 'timeline' && (
        <SectionList
          sections={timelineSections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTimelineItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isFetching}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textLight }]}>
              {t('common.noData')}
            </Text>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Text style={{ color: theme.colors.text }}>{t('common.previous', 'Previous')}</Text>
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: theme.colors.textSecondary }]}>
                  {t('transactions.pageInfo', 'Page {{page}} of {{total}}', { page, total: totalPages })}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Text style={{ color: theme.colors.text }}>{t('common.next', 'Next')}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* FAB Add - hide in calendar view when date selected */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => { setEditingTransaction(null); setFormOpen(true); }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={formOpen || !!editingTransaction}
        onClose={() => { setFormOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? t('transactions.edit', 'Edit Transaction') : t('transactions.add', 'Add Transaction')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <TransactionForm
            transaction={editingTransaction}
            type={editingTransaction?.type || 'expense'}
            onSubmit={handleSubmit}
            onCancel={() => { setFormOpen(false); setEditingTransaction(null); }}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>

      {/* Detail Modal (glassmorphism, design system) */}
      <Modal
        isOpen={!!detailTransaction}
        onClose={() => setDetailTransaction(null)}
        title={t('transactions.detail', 'Transaction')}
      >
        {detailTransaction && (
          <View style={[styles.detail, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.colors.glassBorder }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.amount', 'Amount')}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      detailTransaction.type === 'expense' ? theme.colors.error : theme.colors.success,
                  },
                ]}
              >
                {formatAmount(detailTransaction.amount, detailTransaction.type === 'expense')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.category', 'Category')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {detailTransaction.category || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.description', 'Description')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {detailTransaction.description || '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                {t('transaction.date', 'Date')}
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {formatDate(detailTransaction.date)}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => openEdit(detailTransaction)}
              >
                <Pencil size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{t('common.edit', 'Edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.error }]}
                onPress={() => {
                  setDetailTransaction(null);
                  setDeleteTarget(detailTransaction);
                }}
              >
                <Trash2 size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{t('common.delete', 'Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('transactions.deleteConfirmTitle', 'Delete transaction?')}
        message={t('transactions.deleteConfirmMessage', 'This cannot be undone.')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { ...typography.h2, padding: spacing.md, paddingBottom: spacing.sm },
  viewToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleText: { ...typography.caption, fontWeight: '600' },
  calendarContainer: { padding: spacing.md, paddingBottom: 100 },
  calendarTransactionsList: { marginTop: spacing.md },
  calendarDateTitle: { ...typography.h3, marginBottom: spacing.sm },
  calendarHint: { ...typography.body, textAlign: 'center', marginTop: spacing.lg },
  typeFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
  },
  typeFilterBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeFilterText: { ...typography.label, fontSize: 13 },
  filters: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardSub: { ...typography.bodySmall, marginTop: 2 },
  cardAmount: { ...typography.body, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  pageBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pageInfo: { ...typography.bodySmall },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  detail: { padding: spacing.lg },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { ...typography.caption, marginBottom: 2 },
  detailValue: { ...typography.body },
  timelineSectionHeader: { paddingVertical: spacing.sm, paddingHorizontal: 0, marginTop: spacing.md },
  timelineSectionTitle: { ...typography.label },
  timelineRow: { flexDirection: 'row', marginBottom: spacing.sm },
  timelineLineCol: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 8,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionBtnText: { ...typography.label, color: '#fff' },
});
