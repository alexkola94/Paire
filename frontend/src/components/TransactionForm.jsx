import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUpload, FiX, FiFileText } from 'react-icons/fi'
import { storageService } from '../services/api'
import CurrencyInput from './CurrencyInput'
import CategorySelector from './CategorySelector'
import DateInput from './DateInput'
import FormSection from './FormSection'
import FormLayout from './FormLayout'
import AutoCompleteInput from './AutoCompleteInput'
import DuplicateDetection from './DuplicateDetection'
import SmartCategorySuggestions from './SmartCategorySuggestions'
import QuickFill from './QuickFill'
import RecurringTransaction from './RecurringTransaction'
import SplitTransaction from './SplitTransaction'
import TagsInput from './TagsInput'
import SkeletonLoader from './SkeletonLoader'
import useRecentTransactions from '../hooks/useRecentTransactions'
import './TransactionForm.css'

/**
 * Transaction Form Component
 * Reusable form for creating/editing expenses and income
 */
function TransactionForm({ 
  transaction = null, 
  type = 'expense', 
  onSubmit, 
  onCancel,
  loading = false 
}) {
  const { t } = useTranslation()
  
  // Form state
  const [formData, setFormData] = useState({
    amount: transaction?.amount || '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    date: transaction?.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
    attachment_url: transaction?.attachment_url || '',
    attachment_path: transaction?.attachment_path || '',
    // Phase 3: Advanced features
    isRecurring: transaction?.isRecurring || transaction?.is_recurring || false,
    recurrencePattern: transaction?.recurrencePattern || transaction?.recurrence_pattern || 'monthly',
    recurrenceEndDate: transaction?.recurrenceEndDate || transaction?.recurrence_end_date ? 
      (transaction.recurrenceEndDate || transaction.recurrence_end_date).split('T')[0] : '',
    splitType: transaction?.splitType || transaction?.split_type || null,
    splitPercentage: transaction?.splitPercentage || transaction?.split_percentage || 50,
    paidBy: transaction?.paidBy || transaction?.paid_by || 'me',
    tags: transaction?.tags || transaction?.Tags || []
  })

  const [file, setFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [error, setError] = useState('')
  const [duplicateDismissed, setDuplicateDismissed] = useState(false)

  // Categories based on transaction type
  const expenseCategories = ['food', 'transport', 'utilities', 'entertainment', 'healthcare', 'shopping', 'education', 'other']
  const incomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other']
  const categories = type === 'expense' ? expenseCategories : incomeCategories

  // Fetch recent transactions for smart features
  const {
    recentTransactions,
    loading: loadingRecent,
    getUniqueDescriptions,
    getCategoryFrequency,
    findSimilarTransactions
  } = useRecentTransactions(type, 20)

  // Get description suggestions
  const descriptionSuggestions = useMemo(() => {
    return getUniqueDescriptions()
  }, [recentTransactions])

  // Get suggested categories based on frequency
  const suggestedCategories = useMemo(() => {
    return getCategoryFrequency()
  }, [recentTransactions])

  // Check for duplicate transactions
  const similarTransactions = useMemo(() => {
    if (!formData.amount || !formData.description || duplicateDismissed) {
      return []
    }
    return findSimilarTransactions(
      parseFloat(formData.amount) || 0,
      formData.description,
      formData.date,
      formData.category
    )
  }, [formData.amount, formData.description, formData.date, formData.category, duplicateDismissed])

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  /**
   * Handle file selection
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError(t('transaction.fileSizeError'))
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  /**
   * Remove selected file
   */
  const removeFile = () => {
    setFile(null)
    setFormData(prev => ({
      ...prev,
      attachment_url: '',
      attachment_path: ''
    }))
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate amount
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError(t('transaction.invalidAmount'))
      return
    }

    try {
      let finalData = { 
        ...formData, 
        amount: parseFloat(formData.amount),
        type 
      }

      // Upload file if selected
      if (file) {
        setUploadProgress(true)
        const uploadResult = await storageService.uploadFile(file)
        finalData.attachment_url = uploadResult.url
        finalData.attachment_path = uploadResult.path
        setUploadProgress(false)
      }

      await onSubmit(finalData)
    } catch (err) {
      setError(err.message || t('transaction.errorOccurred'))
      setUploadProgress(false)
    }
  }

  /**
   * Handle quick fill from recent transaction
   */
  const handleQuickFill = (transactionData) => {
    setFormData(prev => ({
      ...prev,
      ...transactionData
    }))
    setError('')
  }

  /**
   * Handle category suggestion selection
   */
  const handleCategorySuggestion = (category) => {
    setFormData(prev => ({
      ...prev,
      category
    }))
  }

  // Show skeleton loader while loading recent transactions
  if (loadingRecent && !transaction) {
    return (
      <div className="transaction-form">
        <SkeletonLoader type="input" count={5} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Duplicate Detection */}
      <DuplicateDetection
        similarTransactions={similarTransactions}
        onDismiss={() => setDuplicateDismissed(true)}
        onProceed={() => setDuplicateDismissed(true)}
      />

      {/* Quick Fill from Recent Transactions */}
      {!transaction && recentTransactions.length > 0 && (
        <QuickFill
          recentTransactions={recentTransactions}
          onFill={handleQuickFill}
          maxItems={5}
        />
      )}

      {/* Basic Information Section */}
      <FormSection title={t('transaction.formSections.basicInfo')}>
        {/* Smart Category Suggestions */}
        {!transaction && suggestedCategories.length > 0 && (
          <div className="form-layout-item-full">
            <SmartCategorySuggestions
              suggestedCategories={suggestedCategories}
              currentCategory={formData.category}
              onSelectCategory={handleCategorySuggestion}
            />
          </div>
        )}

        {/* Amount - Single column for better spacing */}
        <CurrencyInput
          value={formData.amount}
          onChange={handleChange}
          name="amount"
          id="amount"
          label={`${t('transaction.amount')} *`}
          required
          disabled={loading || uploadProgress}
        />

        {/* Category - Full width for better visibility */}
        <div className="form-layout-item-full">
          <CategorySelector
            value={formData.category}
            onChange={handleChange}
            name="category"
            categories={categories}
            type={type}
            label={`${t('transaction.category')} *`}
            required
            disabled={loading || uploadProgress}
          />
        </div>

        {/* Date - Full width */}
        <DateInput
          value={formData.date}
          onChange={handleChange}
          name="date"
          id="date"
          label={`${t('transaction.date')} *`}
          required
          disabled={loading || uploadProgress}
          showQuickButtons={true}
        />
      </FormSection>

      {/* Additional Details Section */}
      <FormSection title={t('transaction.formSections.additionalDetails')} collapsible={true} defaultExpanded={!!formData.description || !!formData.attachment_url || formData.tags.length > 0}>
        {/* Description with Auto-complete */}
        <AutoCompleteInput
          value={formData.description}
          onChange={handleChange}
          suggestions={descriptionSuggestions}
          name="description"
          id="description"
          label={t('transaction.description')}
          placeholder={t('transaction.descriptionPlaceholder')}
          disabled={loading || uploadProgress}
          maxSuggestions={5}
          minChars={2}
        />

        {/* Tags Input */}
        <TagsInput
          tags={formData.tags}
          onChange={handleChange}
          name="tags"
          label={t('transaction.tags.label', 'Tags')}
          maxTags={10}
        />

        {/* File Upload */}
        <div className="form-group">
          <label>
            {t('transaction.attachment')}
          </label>
        
        {!file && !formData.attachment_url ? (
          <div className="file-upload">
            <input
              type="file"
              id="file-input"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="file-input-hidden"
            />
            <label htmlFor="file-input" className="file-upload-label">
              <FiUpload size={20} />
              <span>{t('transaction.uploadReceipt')}</span>
            </label>
          </div>
        ) : (
          <div className="file-preview">
            <FiFileText size={20} />
            <span className="file-name">
              {file?.name || t('transaction.attachedFile')}
            </span>
            <button
              type="button"
              onClick={removeFile}
              className="remove-file-btn"
              aria-label={t('transaction.deleteAttachment')}
            >
              <FiX size={18} />
            </button>
          </div>
        )}
      </div>
      </FormSection>

      {/* Advanced Features Section */}
      <FormSection title={t('transaction.formSections.advanced')} collapsible={true} defaultExpanded={formData.isRecurring || formData.splitType}>
        {/* Recurring Transaction */}
        <RecurringTransaction
          isRecurring={formData.isRecurring}
          recurrencePattern={formData.recurrencePattern}
          recurrenceEndDate={formData.recurrenceEndDate}
          onToggle={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
          onPatternChange={(pattern) => setFormData(prev => ({ ...prev, recurrencePattern: pattern }))}
          onEndDateChange={(date) => setFormData(prev => ({ ...prev, recurrenceEndDate: date }))}
        />

        {/* Split Transaction - Only show for expenses */}
        {type === 'expense' && (
          <SplitTransaction
            enabled={!!formData.splitType}
            splitType={formData.splitType || 'equal'}
            splitPercentage={formData.splitPercentage}
            paidBy={formData.paidBy}
            onToggle={(checked) => setFormData(prev => ({ 
              ...prev, 
              splitType: checked ? 'equal' : null,
              splitPercentage: checked ? 50 : 50
            }))}
            onSplitTypeChange={(splitType) => setFormData(prev => ({ ...prev, splitType }))}
            onPercentageChange={(percentage) => setFormData(prev => ({ ...prev, splitPercentage: percentage }))}
            onPaidByChange={(paidBy) => setFormData(prev => ({ ...prev, paidBy }))}
            partnerName={t('transaction.split.partner', 'Partner')}
          />
        )}
      </FormSection>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading || uploadProgress}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || uploadProgress}
        >
          {loading || uploadProgress ? (
            <>
              <span className="spinner-small"></span>
              {uploadProgress ? t('transaction.uploading') : t('common.loading')}
            </>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </form>
  )
}

export default TransactionForm


