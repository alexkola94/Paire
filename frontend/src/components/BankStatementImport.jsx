import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle, FiX, FiClock, FiTrash2 } from 'react-icons/fi'
import { getBackendUrl } from '../utils/getBackendUrl'
import { authService } from '../services/auth'

/**
 * Component for uploading bank statement files (CSV/Excel)
 * Replaces the direct bank connection functionality
 */
const BankStatementImport = ({ onImportSuccess }) => {
    const { t } = useTranslation()
    const [file, setFile] = useState(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null) // { type: 'success'|'error', message: '', details: {} }
    const fileInputRef = useRef(null)

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragOver(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndSetFile(e.target.files[0])
        }
    }

    const validateAndSetFile = (selectedFile) => {
        // Reset previous results
        setUploadResult(null)

        const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf']
        const extension = '.' + selectedFile.name.split('.').pop().toLowerCase()

        if (!validExtensions.includes(extension)) {
            setUploadResult({
                type: 'error',
                message: t('import.invalidFileType', 'Invalid file type. Please upload a .csv, .xlsx, or .pdf file.')
            })
            return
        }

        // Max size 5MB
        if (selectedFile.size > 5 * 1024 * 1024) {
            setUploadResult({
                type: 'error',
                message: t('import.fileTooLarge', 'File is too large using. Max size is 5MB.')
            })
            return
        }

        setFile(selectedFile)
    }

    const [history, setHistory] = useState([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
            const token = authService.getToken()
            const response = await fetch(`${getBackendUrl()}/api/imports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setHistory(data)
            }
        } catch (error) {
            console.error('Failed to fetch import history', error)
        } finally {
            setIsLoadingHistory(false)
        }
    }

    const handleRevert = async (importId) => {
        if (!window.confirm(t('import.revertConfirm', 'Are you sure you want to revert this import? All associated transactions will be deleted.'))) {
            return
        }

        try {
            const token = authService.getToken()
            const response = await fetch(`${getBackendUrl()}/api/imports/${importId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                fetchHistory() // Refresh history
                if (onImportSuccess) onImportSuccess() // Trigger parent refresh if needed
                alert(t('import.revertSuccess', 'Import reverted successfully.'))
            } else {
                throw new Error('Revert failed')
            }
        } catch (error) {
            console.error('Error reverting import:', error)
            alert(t('import.revertError', 'Failed to revert import.'))
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        setUploadResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const token = authService.getToken()
            const response = await fetch(`${getBackendUrl()}/api/transactions/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || t('import.uploadFailed', 'Upload failed'))
            }

            setUploadResult({
                type: 'success',
                message: t('import.success', 'Import successful!'),
                details: data.result
            })

            setFile(null) // Clear file after success
            if (fileInputRef.current) fileInputRef.current.value = ''

            fetchHistory() // Refresh history list

            if (onImportSuccess) {
                onImportSuccess(data.result)
            }

        } catch (error) {
            console.error('Import error:', error)
            setUploadResult({
                type: 'error',
                message: error.message || t('import.genericError', 'An error occurred during import.')
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="bank-import-container">
            <div
                className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv, .xlsx, .xls, .pdf"
                    style={{ display: 'none' }}
                />

                {!file ? (
                    <div className="drop-zone-content">
                        <FiUpload className="upload-icon" size={40} />
                        <p className="upload-text">
                            {t('import.dragDrop', 'Click or drag file to upload statement')}
                        </p>
                        <p className="upload-subtext">
                            {t('import.formats', 'Supports CSV, Excel, and PDF from major banks')}
                        </p>
                    </div>
                ) : (
                    <div className="file-preview">
                        <FiFile className="file-icon" size={32} />
                        <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button
                            className="remove-file-btn"
                            onClick={(e) => {
                                e.stopPropagation()
                                setFile(null)
                                setUploadResult(null)
                                if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                        >
                            <FiX />
                        </button>
                    </div>
                )}
            </div>

            {file && !uploadResult && (
                <button
                    className="btn btn-primary import-btn"
                    onClick={handleUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <span className="spinner-small"></span>
                    ) : (
                        <>
                            <FiUpload /> {t('import.uploadBtn', 'Import Transactions')}
                        </>
                    )}
                </button>
            )}

            {uploadResult && (
                <div className={`import-result ${uploadResult.type}`}>
                    {uploadResult.type === 'success' ? (
                        <div className="result-content success">
                            <FiCheckCircle size={20} />
                            <div>
                                <h4>{uploadResult.message}</h4>
                                {uploadResult.details && (
                                    <ul className="import-stats">
                                        <li>{t('import.total', 'Imported')}: <strong>{uploadResult.details.totalImported}</strong></li>
                                        <li>{t('import.skipped', 'Skipped (Duplicates)')}: <strong>{uploadResult.details.duplicatesSkipped}</strong></li>
                                        {uploadResult.details.errors > 0 && (
                                            <li className="text-danger">{t('import.errors', 'Errors')}: <strong>{uploadResult.details.errors}</strong></li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="result-content error">
                            <FiAlertCircle size={20} />
                            <span>{uploadResult.message}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="import-instructions">
                <h4>{t('import.instructionsTitle', 'How to import your statement')}</h4>
                <ol>
                    <li>{t('import.step1', 'Log in to your online banking.')}</li>
                    <li>{t('import.step2', 'Download your transaction history as CSV, Excel, or PDF.')}</li>
                    <li>{t('import.step3', 'Upload the file here to sync your transactions.')}</li>
                </ol>
            </div>

            {history.length > 0 && (
                <div className="import-history-section">
                    <details>
                        <summary>
                            <FiClock className="history-icon" />
                            {t('import.historyTitle', 'Import History')} ({history.length})
                        </summary>
                        <div className="history-list">
                            {history.map((record) => (
                                <div key={record.id} className="history-item">
                                    <div className="history-info">
                                        <span className="history-date">
                                            {new Date(record.importDate).toLocaleDateString()} {new Date(record.importDate).toLocaleTimeString()}
                                        </span>
                                        <span className="history-filename">{record.fileName}</span>
                                        <span className="history-stats">
                                            {record.transactionCount} transactions • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(record.totalAmount)}
                                        </span>
                                    </div>
                                    <button
                                        className="revert-btn"
                                        onClick={() => handleRevert(record.id)}
                                        title={t('import.revertTitle', 'Revert this import')}
                                    >
                                        <FiTrash2 /> {t('import.revert', 'Revert')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            <style>{`
        .bank-import-container {
          padding: 1rem;
        }
        .drop-zone {
          border: 2px dashed var(--text-light);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-secondary);
        }
        .drop-zone:hover, .drop-zone.drag-over {
          border-color: var(--success);
          background: var(--bg-secondary);
          opacity: 0.9;
        }
        .drop-zone.has-file {
          border-style: solid;
          border-color: var(--success);
          background: var(--bg-secondary);
        }
        .upload-icon {
          color: var(--text-light);
          margin-bottom: 1rem;
        }
        .upload-text {
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .upload-subtext {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .file-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .file-icon {
          color: var(--success);
        }
        .file-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .file-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .file-size {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .remove-file-btn {
          background: none;
          border: none;
          color: var(--text-light);
          cursor: pointer;
          padding: 4px;
        }
        .remove-file-btn:hover {
          color: var(--error);
        }
        .import-btn {
          width: 100%;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .import-result {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 8px;
        }
        .import-result.success {
          background-color: rgba(46, 204, 113, 0.15);
          border: 1px solid var(--success);
          color: var(--success-dark);
        }
        .import-result.error {
          background-color: rgba(231, 76, 60, 0.15);
          border: 1px solid var(--error);
          color: var(--error);
        }
        .result-content {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .import-stats {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0 0;
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .import-instructions {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--bg-tertiary);
        }
        .import-instructions h4 {
          font-size: 1rem;
          margin-bottom: 0.8rem;
          color: var(--text-primary);
        }
        .import-instructions ol {
          padding-left: 1.2rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .import-instructions li {
          margin-bottom: 0.5rem;
        }

        .import-history-section {
          margin-top: 1.5rem;
          border-top: 1px solid var(--bg-tertiary);
          padding-top: 1rem;
        }
        
        details summary {
          cursor: pointer;
          font-weight: 500;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;
        }
        
        details summary:hover {
          color: var(--success);
        }

        .history-icon {
          color: var(--text-secondary);
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          padding-left: 1rem;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-tertiary);
          padding: 0.8rem;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
        }

        .history-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .history-date {
          font-size: 0.75rem;
          color: var(--text-light);
        }

        .history-filename {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .history-stats {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .revert-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--error-dark);
          color: var(--error);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .revert-btn:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
        }
      `}</style>
        </div>
    )
}

export default BankStatementImport
