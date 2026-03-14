import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hook for formatting currency based on current language
 * Use this instead of hardcoded Intl.NumberFormat('en-US')
 */
export const useCurrencyFormatter = () => {
    const { i18n } = useTranslation()

    const formatCurrency = useCallback((amount) => {
        // Map i18n language codes to locale strings if needed
        // 'el' -> 'el-GR', 'en' -> 'en-IE' (Euro default), etc.
        const localeMap = {
            'en': 'en-IE', // English (Ireland) for Euro formatting preference
            'el': 'el-GR', // Greek
            'es': 'es-ES', // Spanish
            'fr': 'fr-FR'  // French
        }

        const locale = localeMap[i18n.language] || 'en-IE'

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount)
        } catch (error) {
            console.warn('Currency formatting failed, falling back to en-IE', error)
            return new Intl.NumberFormat('en-IE', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount)
        }
    }, [i18n.language])

    return formatCurrency
}

export default useCurrencyFormatter
