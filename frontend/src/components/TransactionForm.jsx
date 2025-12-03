import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUpload, FiX, FiFileText } from 'react-icons/fi'
import { storageService } from '../services/api'
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
    attachment_path: transaction?.attachment_path || ''
  })

  const [file, setFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [error, setError] = useState('')

  // Categories based on transaction type
  const expenseCategories = ['food', 'transport', 'utilities', 'entertainment', 'healthcare', 'shopping', 'education', 'other']
  const incomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other']
  const categories = type === 'expense' ? expenseCategories : incomeCategories

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
        setError('File size must be less than 5MB')
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
      setError('Please enter a valid amount')
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
      setError(err.message || 'An error occurred')
      setUploadProgress(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Amount */}
      <div className="form-group">
        <label htmlFor="amount">
          {t('transaction.amount')} *
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          required
        />
      </div>

      {/* Category */}
      <div className="form-group">
        <label htmlFor="category">
          {t('transaction.category')} *
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">{t('common.select')}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="description">
          {t('transaction.description')}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder={t('transaction.descriptionPlaceholder')}
          rows="3"
        />
      </div>

      {/* Date */}
      <div className="form-group">
        <label htmlFor="date">
          {t('transaction.date')} *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </div>

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
              {file?.name || 'Attached file'}
            </span>
            <button
              type="button"
              onClick={removeFile}
              className="remove-file-btn"
              aria-label="Remove file"
            >
              <FiX size={18} />
            </button>
          </div>
        )}
      </div>

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
              {uploadProgress ? 'Uploading...' : t('common.loading')}
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

