import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUpload, FiX, FiFileText, FiImage, FiFile, FiCheckCircle } from 'react-icons/fi'
import './FileUpload.css'

/**
 * FileUpload Component
 * Enhanced file upload with drag-and-drop, preview, and progress
 */
function FileUpload({
  value = null, // File object or file URL
  onChange,
  onRemove,
  accept = 'image/*,.pdf',
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  label,
  required = false,
  showPreview = true,
  multiple = false,
  className = ''
}) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  /**
   * Get file icon based on type
   */
  const getFileIcon = (file) => {
    if (!file) return FiFileText

    const type = file.type || ''
    if (type.startsWith('image/')) {
      return FiImage
    }
    if (type === 'application/pdf') {
      return FiFileText
    }
    return FiFile
  }

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Validate file
   */
  const validateFile = (file) => {
    setError('')

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
      setError(t('fileUpload.sizeError', { max: maxSizeMB }))
      return false
    }

    // Check file type
    if (accept && accept !== '*') {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const fileType = file.type
      const fileName = file.name.toLowerCase()

      const isAccepted = acceptedTypes.some(acceptedType => {
        if (acceptedType.endsWith('/*')) {
          const baseType = acceptedType.split('/')[0]
          return fileType.startsWith(baseType + '/')
        }
        if (acceptedType.startsWith('.')) {
          return fileName.endsWith(acceptedType)
        }
        return fileType === acceptedType
      })

      if (!isAccepted) {
        setError(t('fileUpload.typeError', { types: accept }))
        return false
      }
    }

    return true
  }

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((files) => {
    if (!files || files.length === 0) return

    const file = files[0] // For now, only handle single file
    if (!validateFile(file)) {
      return
    }

    // Create preview URL for images
    if (file.type.startsWith('image/') && showPreview) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (onChange) {
          onChange({
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type
          })
        }
      }
      reader.readAsDataURL(file)
    } else {
      if (onChange) {
        onChange({
          file,
          preview: null,
          name: file.name,
          size: file.size,
          type: file.type
        })
      }
    }
  }, [onChange, showPreview, maxSize, accept, t]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle file input change
   */
  const handleInputChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  /**
   * Handle drag leave
   */
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  /**
   * Handle drop
   */
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  /**
   * Handle click on drop zone
   */
  const handleDropZoneClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  /**
   * Handle remove file
   */
  const handleRemove = (e) => {
    e.stopPropagation()
    setError('')
    setUploadProgress(0)
    if (onRemove) {
      onRemove()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Determine if we have a file
  const hasFile = value && (value.file || value.preview || (typeof value === 'string' && value))

  // Get file info
  const fileInfo = value && typeof value === 'object' ? value : null
  const fileUrl = typeof value === 'string' ? value : (fileInfo?.preview || fileInfo?.file?.name || null)
  const fileName = fileInfo?.name || (fileInfo?.file?.name) || (typeof value === 'string' ? t('fileUpload.attachedFile') : null)
  const fileSize = fileInfo?.size || (fileInfo?.file?.size) || null

  const FileIcon = hasFile ? getFileIcon(fileInfo?.file || { type: 'image' }) : FiUpload

  return (
    <div className={`file-upload-wrapper ${className}`}>
      {label && (
        <label className="file-upload-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      {error && (
        <div className="file-upload-error">
          {error}
        </div>
      )}

      {!hasFile ? (
        <div
          ref={dropZoneRef}
          className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={t('fileUpload.dropzoneLabel')}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault()
              handleDropZoneClick()
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            disabled={disabled}
            className="file-upload-input"
            aria-label={label || t('fileUpload.selectFile')}
          />
          <div className="file-upload-content">
            <FiUpload className="file-upload-icon" size={32} />
            <p className="file-upload-text">
              {isDragging ? t('fileUpload.dropHere') : t('fileUpload.clickOrDrag')}
            </p>
            <p className="file-upload-hint">
              {t('fileUpload.supportedFormats', { formats: accept })}
              {maxSize && ` (${t('fileUpload.maxSize', { size: formatFileSize(maxSize) })})`}
            </p>
          </div>
        </div>
      ) : (
        <div className="file-upload-preview">
          {fileInfo?.preview || (fileUrl && fileUrl.startsWith('data:') || fileUrl.startsWith('http')) ? (
            <div className="file-upload-image-preview">
              <img
                src={fileInfo?.preview || fileUrl}
                alt={fileName || t('fileUpload.preview')}
                className="file-preview-image"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="file-upload-remove"
                aria-label={t('fileUpload.remove')}
                disabled={disabled}
              >
                <FiX size={18} />
              </button>
            </div>
          ) : (
            <div className="file-upload-file-preview">
              <FileIcon className="file-preview-icon" size={24} />
              <div className="file-preview-info">
                <p className="file-preview-name">{fileName}</p>
                {fileSize && (
                  <p className="file-preview-size">{formatFileSize(fileSize)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="file-upload-remove"
                aria-label={t('fileUpload.remove')}
                disabled={disabled}
              >
                <FiX size={18} />
              </button>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="file-upload-progress">
              <div
                className="file-upload-progress-bar"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <span className="file-upload-progress-text">{uploadProgress}%</span>
            </div>
          )}

          {uploadProgress === 100 && (
            <div className="file-upload-success">
              <FiCheckCircle size={18} />
              <span>{t('fileUpload.uploadComplete')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FileUpload

