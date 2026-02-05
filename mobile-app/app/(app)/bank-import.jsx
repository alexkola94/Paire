/**
 * Bank Statement Import Screen (React Native)
 *
 * Upload CSV, Excel, or PDF bank statements to import transactions.
 * - Choose file via expo-document-picker
 * - Validate type (.csv, .xlsx, .xls, .pdf) and size (max 5MB)
 * - Upload to POST /api/transactions/import
 * - Show result (imported, skipped, errors)
 * - Import history list with revert (DELETE /api/imports/:id)
 * - Theme-aware, responsive, with smooth transitions
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, FileText, X, CheckCircle, AlertCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { importService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { Button, ConfirmationModal, ScreenHeader, useToast } from '../../components';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const VALID_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'];

// MIME types for document picker (Expo)
const PICKER_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
];

function getExtension(name) {
  if (!name || !name.includes('.')) return '';
  return '.' + name.split('.').pop().toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(Number(amount ?? 0));
}

function formatImportDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

export default function BankImportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useBackGesture();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null); // { type: 'success'|'error', message, details }
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [revertTarget, setRevertTarget] = useState(null); // { id, fileName }

  // Fetch import history
  const { data: history = [], refetch: refetchHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importService.getImportHistory(),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (fileAsset) => importService.importTransactions(fileAsset),
    onSuccess: (data) => {
      const result = data?.result ?? data;
      setUploadResult({
        type: 'success',
        message: t('import.success'),
        details: {
          totalImported: result?.totalImported ?? result?.TotalImported ?? 0,
          duplicatesSkipped: result?.duplicatesSkipped ?? result?.DuplicatesSkipped ?? 0,
          errors: result?.errors ?? result?.Errors ?? 0,
        },
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      refetchHistory();
    },
    onError: (error) => {
      const message = error.response?.data?.message ?? error.message ?? t('import.genericError');
      setUploadResult({ type: 'error', message });
      showToast(message, 'error');
    },
  });

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: (id) => importService.revertImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast(t('import.revertSuccess'), 'success');
      setRevertTarget(null);
      refetchHistory();
    },
    onError: () => {
      showToast(t('import.revertError'), 'error');
      setRevertTarget(null);
    },
  });

  const handleChooseFile = useCallback(async () => {
    setUploadResult(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: PICKER_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ext = getExtension(asset.name);
      if (!VALID_EXTENSIONS.includes(ext)) {
        showToast(t('import.invalidFileType'), 'error');
        return;
      }
      const size = asset.size ?? 0;
      if (size > MAX_FILE_SIZE_BYTES) {
        showToast(t('import.fileTooLarge'), 'error');
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'text/csv',
        size,
      });
    } catch (err) {
      showToast(err?.message ?? t('import.genericError'), 'error');
    }
  }, [t, showToast]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }, [selectedFile, uploadMutation]);

  const handleRevertConfirm = useCallback(() => {
    if (revertTarget?.id) {
      revertMutation.mutate(revertTarget.id);
    }
  }, [revertTarget, revertMutation]);

  const dynamicStyles = {
    dropZone: {
      borderColor: selectedFile ? theme.colors.success : theme.colors.primary + '50',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    resultSuccess: { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success + '50' },
    resultError: { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error + '50' },
    historyItem: { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.glassBorder },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('import.title')}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Choose file / drop zone */}
        <TouchableOpacity
          style={[styles.dropZone, dynamicStyles.dropZone]}
          onPress={handleChooseFile}
          activeOpacity={0.8}
          accessibilityLabel={t('import.dragDrop')}
          accessibilityRole="button"
        >
          {!selectedFile ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.dropZoneContent}>
              <Upload size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.dropZoneText, { color: theme.colors.text }]}>{t('import.dragDrop')}</Text>
              <Text style={[styles.dropZoneSubtext, { color: theme.colors.textSecondary }]}>{t('import.formats')}</Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.filePreview}>
              <FileText size={32} color={theme.colors.success} />
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>
                  {formatFileSize(selectedFile.size)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleClearFile();
                }}
                style={styles.removeFileBtn}
                accessibilityLabel={t('common.close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Upload button (when file selected and no result yet) */}
        {selectedFile && !uploadResult && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.uploadBtnWrap}>
            <Button
              onPress={handleUpload}
              disabled={uploadMutation.isPending}
              variant="primary"
              title={t('import.uploadBtn')}
              leftIcon={Upload}
              loading={uploadMutation.isPending}
              style={styles.importBtn}
            />
          </Animated.View>
        )}

        {/* Result message (success or error) */}
        {uploadResult && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.resultCard,
              uploadResult.type === 'success' ? dynamicStyles.resultSuccess : dynamicStyles.resultError,
            ]}
          >
            {uploadResult.type === 'success' ? (
              <View style={styles.resultContent}>
                <CheckCircle size={20} color={theme.colors.success} />
                <View style={styles.resultTextBlock}>
                  <Text style={[styles.resultTitle, { color: theme.colors.success }]}>{uploadResult.message}</Text>
                  {uploadResult.details && (
                    <View style={styles.statsRow}>
                      <Text style={[styles.statsText, { color: theme.colors.text }]}>
                        {t('import.total')}: <Text style={styles.statsBold}>{uploadResult.details.totalImported}</Text>
                      </Text>
                      <Text style={[styles.statsText, { color: theme.colors.text }]}>
                        {t('import.skipped')}: <Text style={styles.statsBold}>{uploadResult.details.duplicatesSkipped}</Text>
                      </Text>
                      {uploadResult.details.errors > 0 && (
                        <Text style={[styles.statsText, { color: theme.colors.error }]}>
                          {t('import.errors')}: <Text style={styles.statsBold}>{uploadResult.details.errors}</Text>
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.resultContent}>
                <AlertCircle size={20} color={theme.colors.error} />
                <Text style={[styles.resultMessage, { color: theme.colors.error }]}>{uploadResult.message}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Instructions */}
        <View style={[styles.section, { borderTopColor: theme.colors.glassBorder }]}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setInstructionsExpanded(!instructionsExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('import.instructionsTitle')}</Text>
            {instructionsExpanded ? <ChevronUp size={20} color={theme.colors.textSecondary} /> : <ChevronDown size={20} color={theme.colors.textSecondary} />}
          </TouchableOpacity>
          {instructionsExpanded && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.instructionsList}>
              <Text style={[styles.instructionItem, { color: theme.colors.textSecondary }]}>1. {t('import.step1')}</Text>
              <Text style={[styles.instructionItem, { color: theme.colors.textSecondary }]}>2. {t('import.step2')}</Text>
              <Text style={[styles.instructionItem, { color: theme.colors.textSecondary }]}>3. {t('import.step3')}</Text>
            </Animated.View>
          )}
        </View>

        {/* Import history */}
        {history.length > 0 && (
          <View style={[styles.section, { borderTopColor: theme.colors.glassBorder }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setHistoryExpanded(!historyExpanded)}
              activeOpacity={0.7}
            >
              <Clock size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('import.historyTitle')} ({history.length})
              </Text>
              {historyExpanded ? <ChevronUp size={20} color={theme.colors.textSecondary} /> : <ChevronDown size={20} color={theme.colors.textSecondary} />}
            </TouchableOpacity>
            {historyExpanded && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.historyList}>
                {isLoadingHistory ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={styles.historyLoader} />
                ) : (
                  history.map((record) => (
                    <View
                      key={record.id}
                      style={[styles.historyItem, dynamicStyles.historyItem]}
                    >
                      <View style={styles.historyInfo}>
                        <Text style={[styles.historyDate, { color: theme.colors.textLight }]}>
                          {formatImportDate(record.importDate)}
                        </Text>
                        <Text style={[styles.historyFileName, { color: theme.colors.text }]} numberOfLines={1}>
                          {record.fileName}
                        </Text>
                        <Text style={[styles.historyStats, { color: theme.colors.textSecondary }]}>
                          {record.transactionCount} transactions • {formatCurrency(record.totalAmount)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.revertBtn, { borderColor: theme.colors.error + '50' }]}
                        onPress={() => setRevertTarget({ id: record.id, fileName: record.fileName })}
                        accessibilityLabel={t('import.revertTitle')}
                      >
                        <Trash2 size={16} color={theme.colors.error} />
                        <Text style={[styles.revertBtnText, { color: theme.colors.error }]}>{t('import.revert')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Revert confirmation modal */}
      <ConfirmationModal
        isOpen={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        onConfirm={handleRevertConfirm}
        title={t('import.revertTitle')}
        message={t('import.revertConfirm')}
        confirmText={t('import.revert')}
        variant="danger"
        loading={revertMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 24,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    transition: 'border-color 0.3s ease',
  },
  dropZoneContent: {
    alignItems: 'center',
  },
  dropZoneText: {
    ...typography.body,
    fontWeight: '500',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  dropZoneSubtext: {
    ...typography.caption,
    fontSize: 13,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  fileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  fileName: {
    ...typography.body,
    fontWeight: '500',
  },
  fileSize: {
    ...typography.caption,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: spacing.xs,
  },
  uploadBtnWrap: {
    marginTop: spacing.md,
  },
  importBtn: {
    width: '100%',
  },
  resultCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultTextBlock: {
    flex: 1,
  },
  resultTitle: {
    ...typography.label,
  },
  resultMessage: {
    ...typography.body,
    flex: 1,
  },
  statsRow: {
    marginTop: spacing.xs,
    gap: 2,
  },
  statsText: {
    ...typography.caption,
    fontSize: 13,
  },
  statsBold: {
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    flex: 1,
  },
  instructionsList: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  instructionItem: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  historyList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  historyLoader: {
    marginVertical: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyDate: {
    ...typography.caption,
  },
  historyFileName: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  historyStats: {
    ...typography.caption,
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  revertBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
