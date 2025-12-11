import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BottomNavigation from '../../components/BottomNavigation'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Mock Translations
const resources = {
    en: {
        translation: {
            navigation: {
                dashboard: 'Dashboard',
                expenses: 'Expenses',
                income: 'Income',
                profile: 'Profile'
            },
            income: { addIncome: 'Add Income' },
            expenses: { addExpense: 'Add Expense' }
        }
    },
    el: {
        translation: {
            navigation: {
                dashboard: 'Πίνακας Ελέγχου',
                expenses: 'Έξοδα',
                income: 'Έσοδα',
                profile: 'Προφίλ'
            },
            income: { addIncome: 'Προσθήκη Εσόδου' },
            expenses: { addExpense: 'Προσθήκη Εξόδου' }
        }
    }
}

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
})

const renderWithRouterAndLang = (lang = 'en') => {
    i18n.changeLanguage(lang)
    return render(
        <I18nextProvider i18n={i18n}>
            <BrowserRouter>
                <BottomNavigation />
            </BrowserRouter>
        </I18nextProvider>
    )
}

describe('BottomNavigation Layout & Translation', () => {
    it('renders correctly in English', () => {
        renderWithRouterAndLang('en')
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Expenses')).toBeInTheDocument()
    })

    it('renders using Greek, testing for potential layout overflow content', () => {
        renderWithRouterAndLang('el')
        expect(screen.getByText('Πίνακας Ελέγχου')).toBeInTheDocument()
        expect(screen.getByText('Έξοδα')).toBeInTheDocument()
        // Verify that the text is present. In a real browser test we would check dimensions,
        // but unit testing ensures the correct long text is applied to the DOM.
    })
})
