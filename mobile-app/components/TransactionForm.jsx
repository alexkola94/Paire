/**
 * TransactionForm Component (React Native)
 * Ported from frontend/src/components/TransactionForm.jsx
 * 
 * Reusable form for creating/editing expenses and income.
 * Features:
 * - Amount input with quick amounts
 * - Visual category selector
 * - Date picker with quick buttons
 * - Description input
 * - Optional notes in collapsible section
 * - Receipt attachment support
 * - Form validation
 * - Smart category suggestions based on description
 * - Duplicate transaction detection
 * - Quick fill from recent transactions
 * - Theme-aware styling
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Upload, X, FileText, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';
import CurrencyInput from './CurrencyInput';
import CategorySelector from './CategorySelector';
import DateInput from './DateInput';
import FormSection from './FormSection';
import Button from './Button';
import SmartCategorySuggestions from './SmartCategorySuggestions';
import DuplicateDetection from './DuplicateDetection';
import QuickFill from './QuickFill';

// Default categories
const EXPENSE_CATEGORIES = [
  'food', 'transportation', 'utilities', 'entertainment', 'healthcare',
  'shopping', 'education', 'housing', 'personal', 'other'
];
const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'gift', 'other'];

export default function TransactionForm({
  transaction = null,
  type = 'expense',
  onSubmit,
  onCancel,
  loading = false,
  recentTransactions = [],  // For QuickFill and DuplicateDetection
  showSmartFeatures = true, // Toggle smart features
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Initialize form state
  const [formData, setFormData] = useState({
    amount: transaction?.amount || '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    date: transaction?.date 
      ? transaction.date.split('T')[0] 
      : new Date().toISOString().split('T')[0],
    notes: transaction?.notes || '',
    attachmentUrl: transaction?.attachmentUrl || '',
    attachmentPath: transaction?.attachmentPath || '',
  });

  const [attachment, setAttachment] = useState(null); // Local file URI
  const [uploadProgress, setUploadProgress] = useState(false);
  const [error, setError] = useState('');
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Only show smart features for new transactions
  const isNewTransaction = !transaction?.id;
  const enableSmartFeatures = showSmartFeatures && isNewTransaction;

  // Get categories based on type
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  /**
   * Handle field changes
   */
  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  }, []);

  /**
   * Handle event-style changes (from DateInput, CategorySelector)
   */
  const handleEventChange = useCallback((e) => {
    const { name, value } = e.target;
    handleChange(name, value);
  }, [handleChange]);

  /**
   * Handle quick fill from recent transaction
   */
  const handleQuickFill = useCallback((selectedTx) => {
    setFormData(prev => ({
      ...prev,
      amount: String(selectedTx.amount || ''),
      category: selectedTx.category || '',
      description: selectedTx.description || '',
      // Keep current date
    }));
    setDuplicateDismissed(false); // Reset duplicate detection
  }, []);

  /**
   * Handle smart category suggestion selection
   */
  const handleCategorySuggestion = useCallback((category) => {
    handleChange('category', category);
  }, [handleChange]);

  /**
   * Pick image from gallery
   */
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired', 'Permission Required'),
          t('transaction.galleryPermission', 'We need permission to access your photos.')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setAttachment(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError(t('transaction.imagePickError', 'Failed to pick image'));
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired', 'Permission Required'),
          t('transaction.cameraPermission', 'We need permission to access your camera.')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setAttachment(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      setError(t('transaction.cameraError', 'Failed to take photo'));
    }
  };

  /**
   * Remove attachment
   */
  const removeAttachment = () => {
    setAttachment(null);
    setFormData(prev => ({
      ...prev,
      attachmentUrl: '',
      attachmentPath: '',
    }));
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError(t('transaction.invalidAmount', 'Please enter a valid amount'));
      return false;
    }
    if (!formData.category) {
      setError(t('transaction.categoryRequired', 'Please select a category'));
      return false;
    }
    if (!formData.date) {
      setError(t('transaction.dateRequired', 'Please select a date'));
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const submitData = {
        ...formData,
        id: transaction?.id,
        amount: parseFloat(formData.amount),
        type,
      };

      // If there's a new attachment, pass it for upload
      if (attachment) {
        submitData.newAttachment = attachment;
      }

      await onSubmit?.(submitData);
    } catch (err) {
      setError(err.message || t('transaction.errorOccurred', 'An error occurred'));
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: {
      backgroundColor: theme.colors.surface,
    },
    input: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
      color: theme.colors.text,
    },
    placeholder: theme.colors.textLight,
    label: {
      color: theme.colors.text,
    },
    error: {
      backgroundColor: `${theme.colors.error}15`,
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
    },
    attachmentBtn: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.glassBorder,
    },
    attachmentBtnText: {
      color: theme.colors.textSecondary,
    },
  };

  return (
    <ScrollView 
      style={[styles.container, dynamicStyles.container]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Error Message */}
      {error !== '' && (
        <View style={[styles.errorContainer, dynamicStyles.error]}>
          <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
        </View>
      )}

      {/* Quick Fill from Recent Transactions */}
      {enableSmartFeatures && recentTransactions.length > 0 && (
        <QuickFill
          recentTransactions={recentTransactions}
          type={type}
          onSelectTransaction={handleQuickFill}
          disabled={loading || uploadProgress}
        />
      )}

      {/* Duplicate Detection Warning */}
      {enableSmartFeatures && formData.amount && (
        <DuplicateDetection
          newTransaction={formData}
          existingTransactions={recentTransactions}
          onDismiss={() => setDuplicateDismissed(true)}
          dismissed={duplicateDismissed}
        />
      )}

      {/* Basic Information Section */}
      <FormSection title={t('transaction.formSections.basicInfo', 'Basic Information')}>
        {/* Amount */}
        <CurrencyInput
          value={formData.amount}
          onChange={(value) => handleChange('amount', value)}
          label={`${t('transaction.amount', 'Amount')} *`}
          placeholder="0.00"
          disabled={loading || uploadProgress}
          quickAmounts={type === 'expense' ? [5, 10, 20, 50] : [100, 500, 1000, 5000]}
        />

        {/* Category */}
        <CategorySelector
          value={formData.category}
          onChange={handleEventChange}
          name="category"
          type={type}
          categories={categories}
          label={`${t('transaction.category', 'Category')} *`}
          required
          disabled={loading || uploadProgress}
        />

        {/* Smart Category Suggestions */}
        {enableSmartFeatures && formData.description && (
          <SmartCategorySuggestions
            description={formData.description}
            type={type}
            currentCategory={formData.category}
            onSelectCategory={handleCategorySuggestion}
            disabled={loading || uploadProgress}
          />
        )}

        {/* Date */}
        <DateInput
          value={formData.date}
          onChange={handleEventChange}
          name="date"
          label={`${t('transaction.date', 'Date')} *`}
          required
          disabled={loading || uploadProgress}
          showQuickButtons
        />

        {/* Description */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('transaction.description', 'Description')}
          </Text>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
            placeholder={t('transaction.descriptionPlaceholder', 'What was this for?')}
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading && !uploadProgress}
            maxLength={200}
          />
        </View>
      </FormSection>

      {/* Additional Details Section */}
      <FormSection
        title={t('transaction.formSections.additionalDetails', 'Additional Details')}
        collapsible
        defaultExpanded={!!(formData.notes || formData.attachmentUrl || attachment)}
      >
        {/* Notes */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('transaction.notes', 'Notes')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, dynamicStyles.input]}
            value={formData.notes}
            onChangeText={(text) => handleChange('notes', text)}
            placeholder={t('transaction.notesPlaceholder', 'Add any additional notes...')}
            placeholderTextColor={dynamicStyles.placeholder}
            editable={!loading && !uploadProgress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Attachment */}
        <View style={styles.fieldWrapper}>
          <Text style={[styles.label, dynamicStyles.label]}>
            {t('transaction.attachment', 'Receipt')}
          </Text>

          {!attachment && !formData.attachmentUrl ? (
            <View style={styles.attachmentButtons}>
              <TouchableOpacity
                style={[styles.attachmentBtn, dynamicStyles.attachmentBtn]}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.attachmentBtnText, dynamicStyles.attachmentBtnText]}>
                  {t('transaction.chooseImage', 'Gallery')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attachmentBtn, dynamicStyles.attachmentBtn]}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <Camera size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.attachmentBtnText, dynamicStyles.attachmentBtnText]}>
                  {t('transaction.takePhoto', 'Camera')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.attachmentPreview, dynamicStyles.attachmentBtn]}>
              {(attachment?.uri || formData.attachmentUrl) && (
                <Image
                  source={{ uri: attachment?.uri || formData.attachmentUrl }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.attachmentInfo}>
                <FileText size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.attachmentName, { color: theme.colors.text }]} numberOfLines={1}>
                  {attachment?.fileName || t('transaction.attachedFile', 'Attached file')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={removeAttachment}
                style={styles.removeAttachmentBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </FormSection>

      {/* Form Actions */}
      <View style={styles.actions}>
        <Button
          title={t('common.cancel', 'Cancel')}
          variant="secondary"
          onPress={onCancel}
          disabled={loading || uploadProgress}
          style={styles.actionBtn}
        />
        <Button
          title={loading || uploadProgress 
            ? t('common.saving', 'Saving...') 
            : t('common.save', 'Save')
          }
          variant="primary"
          onPress={handleSubmit}
          loading={loading || uploadProgress}
          disabled={loading || uploadProgress}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  fieldWrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attachmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  attachmentBtnText: {
    ...typography.bodySmall,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  attachmentImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  attachmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachmentName: {
    ...typography.bodySmall,
    flex: 1,
  },
  removeAttachmentBtn: {
    padding: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
  },
});
