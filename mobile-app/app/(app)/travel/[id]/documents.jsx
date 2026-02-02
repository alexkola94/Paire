/**
 * Trip Documents Screen (React Native)
 * List trip documents; add/delete. Optional: link to uploaded file URL.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, FileText, Trash2, ExternalLink } from 'lucide-react-native';
import { travelService } from '../../../../services/api';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../../constants/theme';
import { Modal, Button, useToast, ConfirmationModal } from '../../../../components';

export default function TripDocumentsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['travel-trip', id],
    queryFn: () => travelService.getTrip(id),
    enabled: !!id,
  });

  const { data: docs = [], refetch, isFetching } = useQuery({
    queryKey: ['travel-documents', id],
    queryFn: () => travelService.getDocuments(id),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => travelService.createDocument(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-documents', id] });
      showToast(t('travel.documents.docAdded', 'Document added'), 'success');
      setAddModalOpen(false);
      setFormName('');
      setFormUrl('');
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => travelService.deleteDocument(id, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-documents', id] });
      showToast(t('travel.documents.docDeleted', 'Document removed'), 'success');
      setDeleteTarget(null);
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSubmit = () => {
    const name = formName.trim();
    if (!name) {
      showToast(t('validation.required', { field: t('travel.documents.name', 'Name') }), 'error');
      return;
    }
    createMutation.mutate({
      name,
      url: formUrl.trim() || null,
      type: 'other',
    });
  };

  const openUrl = (url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      Linking.openURL(url).catch(() => showToast(t('common.error'), 'error'));
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}
      onPress={() => item.url && openUrl(item.url)}
      onLongPress={() => setDeleteTarget(item)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <FileText size={22} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.docTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name || '—'}
          </Text>
          {item.url ? (
            <Text style={[styles.docUrl, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.url}
            </Text>
          ) : null}
        </View>
        {item.url ? <ExternalLink size={18} color={theme.colors.primary} /> : null}
      </View>
    </TouchableOpacity>
  );

  if (tripLoading || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('travel.documents.title', 'Documents')}</Text>
        <TouchableOpacity
          onPress={() => setAddModalOpen(true)}
          style={[styles.headerAddBtn, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
          accessibilityLabel={t('travel.documents.addDoc', 'Add document')}
          accessibilityRole="button"
        >
          <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={docs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textLight }]}>
            {t('travel.documents.noDocs', 'No documents yet. Tap + to add.')}
          </Text>
        }
      />

      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setFormName(''); setFormUrl(''); }}
        title={t('travel.documents.addDoc', 'Add document')}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.documents.name', 'Name')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.documents.name', 'Name'), formName);
                if (v != null) setFormName(v);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formName || '—'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('travel.documents.url', 'URL (optional)')}</Text>
            <TouchableOpacity
              style={[styles.inputTouch, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder }]}
              onPress={() => {
                const v = prompt(t('travel.documents.url', 'URL'), formUrl);
                if (v != null) setFormUrl(v);
              }}
            >
              <Text style={{ color: theme.colors.text }} numberOfLines={1}>{formUrl || '—'}</Text>
            </TouchableOpacity>
          </View>
          <Button title={t('travel.documents.addDoc', 'Add document')} onPress={handleSubmit} loading={createMutation.isPending} />
        </ScrollView>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t('travel.documents.deleteDoc', 'Delete document?')}
        message={t('travel.documents.deleteMessage', 'Are you sure you want to delete this document?')}
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { flex: 1, ...typography.h3 },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  docTitle: { ...typography.body, fontWeight: '600' },
  docUrl: { ...typography.bodySmall, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl, ...typography.body },
  formRow: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputTouch: { padding: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1 },
});
