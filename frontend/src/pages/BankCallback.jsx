import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
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
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  return (
    <div className="bank-callback-page">
      <motion.div 
        className="bank-callback-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {status === 'processing' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <LogoLoader size="medium" />
            </motion.div>
            <motion.h2 variants={itemVariants}>
              {t('profile.openBanking.callback.processing', 'Processing Authorization...')}
            </motion.h2>
            <motion.p variants={itemVariants}>
              {t('profile.openBanking.callback.processingMessage', 'Please wait while we complete your bank connection.')}
            </motion.p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="success-icon"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              ✓
            </motion.div>
            <motion.h2 variants={itemVariants}>{t('common.success', 'Success!')}</motion.h2>
            <motion.p variants={itemVariants}>{message}</motion.p>
            <motion.p 
              className="closing-message"
              variants={itemVariants}
            >
              {t('profile.openBanking.callback.closing', 'This window will close automatically...')}
            </motion.p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="error-icon"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              ✗
            </motion.div>
            <motion.h2 variants={itemVariants}>{t('common.error', 'Error')}</motion.h2>
            <motion.p variants={itemVariants}>{message}</motion.p>
            <motion.p 
              className="closing-message"
              variants={itemVariants}
            >
              {t('profile.openBanking.callback.closing', 'This window will close automatically...')}
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default BankCallback

