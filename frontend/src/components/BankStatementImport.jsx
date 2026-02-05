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
                message: t('import.invalidFileType')
            })
            return
        }

        // Max size 5MB
        if (selectedFile.size > 5 * 1024 * 1024) {
            setUploadResult({
                type: 'error',
                message: t('import.fileTooLarge')
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
        if (!window.confirm(t('import.revertConfirm'))) {
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
                alert(t('import.revertSuccess'))
            } else {
                throw new Error('Revert failed') // i18n-ignore
            }
        } catch (error) {
            console.error('Error reverting import:', error)
            alert(t('import.revertError'))
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
                throw new Error(data.message || t('import.uploadFailed'))
            }

            setUploadResult({
                type: 'success',
                message: t('import.success'),
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
                message: error.message || t('import.genericError')
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
                            {t('import.dragDrop')}
                        </p>
                        <p className="upload-subtext">
                            {t('import.formats')}
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
                            <FiUpload /> {t('import.uploadBtn')}
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
                                        <li>{t('import.total')}: <strong>{uploadResult.details.totalImported}</strong></li>
                                        <li>{t('import.skipped')}: <strong>{uploadResult.details.duplicatesSkipped}</strong></li>
                                        {uploadResult.details.manualDuplicatesSkipped > 0 && (
                                            <li>{t('import.matchedManual')}: <strong>{uploadResult.details.manualDuplicatesSkipped}</strong></li>
                                        )}
                                        {uploadResult.details.errors > 0 && (
                                            <li className="text-danger">{t('import.errors')}: <strong>{uploadResult.details.errors}</strong></li>
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
                <h4>{t('import.instructionsTitle')}</h4>
                <ol>
                    <li>{t('import.step1')}</li>
                    <li>{t('import.step2')}</li>
                    <li>{t('import.step3')}</li>
                </ol>
            </div>

            {history.length > 0 && (
                <div className="import-history-section">
                    <details>
                        <summary>
                            <FiClock className="history-icon" />
                            {t('import.historyTitle')} ({history.length})
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
                                        title={t('import.revertTitle')}
                                    >
                                        <FiTrash2 /> {t('import.revert')}
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
          border: 2px dashed rgba(139, 92, 246, 0.3);
          border-radius: 24px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          /* Enhanced glassmorphism */
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          /* Multi-layered box shadows */
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 4px 16px rgba(0, 0, 0, 0.04),
            0 2px 8px rgba(0, 0, 0, 0.02),
            0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        }
        [data-theme='dark'] .drop-zone {
          background: rgba(15, 7, 26, 0.4);
          border-color: rgba(139, 92, 246, 0.2);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.2),
            0 4px 16px rgba(0, 0, 0, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.02) inset;
        }
        .drop-zone:hover, .drop-zone.drag-over {
          border-color: #8B5CF6;
          transform: translateY(-4px);
          box-shadow: 
            0 16px 48px rgba(139, 92, 246, 0.2),
            0 8px 24px rgba(139, 92, 246, 0.15),
            0 4px 12px rgba(139, 92, 246, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.3) inset;
        }
        .drop-zone.has-file {
          border-style: solid;
          border-color: #10B981;
          background: rgba(16, 185, 129, 0.1);
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
          /* Enhanced glassmorphism with Vitality Green */
          background: rgba(16, 185, 129, 0.15);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          color: #10B981;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
        }
        .import-result.error {
          /* Enhanced glassmorphism with Coral */
          background: rgba(239, 68, 68, 0.15);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          color: #EF4444;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
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
          /* Enhanced glassmorphism */
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          padding: 0.8rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        [data-theme='dark'] .history-item {
          background: rgba(15, 7, 26, 0.3);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .history-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
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
          /* Enhanced glassmorphism */
          background: rgba(239, 68, 68, 0.1);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
        }

        .revert-btn:hover {
          background: linear-gradient(135deg, #EF4444 0%, #F87171 50%, #FCA5A5 100%);
          color: white;
          border-color: #EF4444;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
      `}</style>
        </div>
    )
}

export default BankStatementImport
