import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUpload, FiX, FiFileText, FiInfo, FiSettings } from 'react-icons/fi'
import { storageService } from '../../services/api'
import CurrencyInput from './CurrencyInput'
import CategorySelector from './CategorySelector'
import DateInput from './DateInput'
import FormTabs from './FormTabs'

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
    attachmentUrl: transaction?.attachmentUrl || '',
    attachmentPath: transaction?.attachmentPath || '',
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
  const [activeTab, setActiveTab] = useState('basic')

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
  }, [recentTransactions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get suggested categories based on frequency
  const suggestedCategories = useMemo(() => {
    return getCategoryFrequency()
  }, [recentTransactions]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [formData.amount, formData.description, formData.date, formData.category, duplicateDismissed]) // eslint-disable-line react-hooks/exhaustive-deps

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
      attachmentUrl: '',
      attachmentPath: ''
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
        id: transaction?.id,
        amount: parseFloat(formData.amount),
        recurrenceEndDate: formData.recurrenceEndDate || null,
        type
      }

      // Upload file if selected
      if (file) {
        setUploadProgress(true)
        const uploadResult = await storageService.uploadFile(file)
        finalData.attachmentUrl = uploadResult.url
        finalData.attachmentPath = uploadResult.path
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

  const tabConfig = [
    { id: 'basic', label: t('transaction.formSections.basicInfo'), icon: <FiInfo /> },
    { id: 'details', label: t('transaction.formSections.additionalDetails'), icon: <FiFileText /> },
    { id: 'advanced', label: t('transaction.formSections.advanced'), icon: <FiSettings /> }
  ]

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <FormTabs.Bar
        tabs={tabConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="form-with-scroll">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <DuplicateDetection
          similarTransactions={similarTransactions}
          onDismiss={() => setDuplicateDismissed(true)}
          onProceed={() => setDuplicateDismissed(true)}
        />

        <FormTabs.Content activeTab={activeTab}>
        {/* Tab 1: Basic Info */}
        <FormTabs.Panel id="basic">
          {!transaction && recentTransactions.length > 0 && (
            <div className="form-layout-item-full">
              <QuickFill
                recentTransactions={recentTransactions}
                onFill={handleQuickFill}
                maxItems={5}
              />
            </div>
          )}
          {!transaction && suggestedCategories.length > 0 && (
            <div className="form-layout-item-full">
              <SmartCategorySuggestions
                suggestedCategories={suggestedCategories}
                currentCategory={formData.category}
                onSelectCategory={handleCategorySuggestion}
              />
            </div>
          )}

          <CurrencyInput
            value={formData.amount}
            onChange={handleChange}
            name="amount"
            id="amount"
            label={`${t('transaction.amount')} *`}
            required
            disabled={loading || uploadProgress}
          />

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

          <div className="form-layout-item-full">
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
          </div>
        </FormTabs.Panel>

        {/* Tab 2: Details */}
        <FormTabs.Panel id="details">
          <TagsInput
            tags={formData.tags}
            onChange={handleChange}
            name="tags"
            label={t('transaction.tags.label', 'Tags')}
            maxTags={10}
          />

          <div className="form-group">
            <label>
              {t('transaction.attachment')}
            </label>

            {!file && !formData.attachmentUrl ? (
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
        </FormTabs.Panel>

        {/* Tab 3: Advanced */}
        <FormTabs.Panel id="advanced">
          <RecurringTransaction
            isRecurring={formData.isRecurring}
            recurrencePattern={formData.recurrencePattern}
            recurrenceEndDate={formData.recurrenceEndDate}
            onToggle={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
            onPatternChange={(pattern) => setFormData(prev => ({ ...prev, recurrencePattern: pattern }))}
            onEndDateChange={(date) => setFormData(prev => ({ ...prev, recurrenceEndDate: date }))}
          />

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
        </FormTabs.Panel>
        </FormTabs.Content>
      </div>

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


