import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LogoLoader from '../components/LogoLoader'
import './BankCallback.css'

/**
 * Bank Callback Page
 * Handles OAuth callback from bank authorization
 * This page is opened in a popup window and processes the authorization code
 */
function BankCallback() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('processing') // processing, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract parameters from URL
        const success = searchParams.get('success')
        const error = searchParams.get('error')

        // Check for error from backend
        if (error) {
          setStatus('error')
          setMessage(t('profile.openBanking.callback.bankError', 'Bank authorization was cancelled or failed.'))
          
          // Notify parent window of error
          if (window.opener) {
            window.opener.postMessage(
              { type: 'BANK_CONNECTION_ERROR', error: error },
              window.location.origin
            )
          }
          
          // Close popup after 3 seconds
          setTimeout(() => {
            if (window.opener) {
              window.close()
            }
          }, 3000)
          return
        }

        // Check for success indicator from backend
        if (success === 'true') {
          // Success - backend has already processed the connection
          setStatus('success')
          setMessage(t('profile.openBanking.connectionSuccess', 'Bank account connected successfully!'))

          // Notify parent window that connection was successful
          if (window.opener) {
            window.opener.postMessage(
              { type: 'BANK_CONNECTION_SUCCESS' },
              window.location.origin
            )
          }

          // Close popup after 2 seconds
          setTimeout(() => {
            window.close()
          }, 2000)
          return
        }

        // If we reach here, something unexpected happened
        setStatus('error')
        setMessage(t('profile.openBanking.callback.missingParams', 'Missing authorization parameters.'))
        
        if (window.opener) {
          window.opener.postMessage(
            { type: 'BANK_CONNECTION_ERROR', error: 'Unexpected callback state' },
            window.location.origin
          )
        }
        
        setTimeout(() => {
          if (window.opener) {
            window.close()
          }
        }, 3000)
      } catch (error) {
        console.error('Error processing bank callback:', error)
        setStatus('error')
        setMessage(error.message || t('profile.openBanking.callback.connectionFailed', 'Failed to complete bank connection. Please try again.'))

        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage(
            { type: 'BANK_CONNECTION_ERROR', error: error.message },
            window.location.origin
          )
        }

        // Close popup after 3 seconds
        setTimeout(() => {
          window.close()
        }, 3000)
      }
    }

    processCallback()
  }, [searchParams])

  return (
    <div className="bank-callback-page">
      <div className="bank-callback-content">
        {status === 'processing' && (
          <>
            <LogoLoader size="medium" />
            <h2>{t('profile.openBanking.callback.processing', 'Processing Authorization...')}</h2>
            <p>{t('profile.openBanking.callback.processingMessage', 'Please wait while we complete your bank connection.')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>{t('common.success', 'Success!')}</h2>
            <p>{message}</p>
            <p className="closing-message">{t('profile.openBanking.callback.closing', 'This window will close automatically...')}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>{t('common.error', 'Error')}</h2>
            <p>{message}</p>
            <p className="closing-message">{t('profile.openBanking.callback.closing', 'This window will close automatically...')}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default BankCallback

