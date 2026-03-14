import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { lazyWithRetry } from '../shared/utils/lazyWithRetry'
import { sessionManager } from '../shared/services/sessionManager'
import Layout from '../shared/components/Layout'
import LogoLoader from '../shared/components/LogoLoader'

const TravelApp = lazy(() => import('../features/travel/TravelApp'))

const Login = lazyWithRetry(() => import('../features/auth/pages/Login'))
const ForgotPassword = lazyWithRetry(() => import('../features/auth/pages/ForgotPassword'))
const EmailConfirmation = lazyWithRetry(() => import('../features/auth/pages/EmailConfirmation'))
const ResetPassword = lazyWithRetry(() => import('../features/auth/pages/ResetPassword'))
const AcceptInvitation = lazyWithRetry(() => import('../features/partnership/pages/AcceptInvitation'))
const TwoFactorSetup = lazyWithRetry(() => import('../features/auth/pages/TwoFactorSetup'))
const Dashboard = lazyWithRetry(() => import('../features/finance/pages/Dashboard'))
const Expenses = lazyWithRetry(() => import('../features/finance/pages/Expenses'))
const Income = lazyWithRetry(() => import('../features/finance/pages/Income'))
const AllTransactions = lazyWithRetry(() => import('../features/finance/pages/AllTransactions'))
const Loans = lazyWithRetry(() => import('../features/finance/pages/Loans'))
const Profile = lazyWithRetry(() => import('../features/profile/pages/Profile'))
const Analytics = lazyWithRetry(() => import('../features/analytics/pages/Analytics'))
const Partnership = lazyWithRetry(() => import('../features/partnership/pages/Partnership'))
const Budgets = lazyWithRetry(() => import('../features/finance/pages/Budgets'))
const ReminderSettings = lazyWithRetry(() => import('../features/notifications/pages/ReminderSettings'))
const SavingsGoals = lazyWithRetry(() => import('../features/finance/pages/SavingsGoals'))
const Receipts = lazyWithRetry(() => import('../features/finance/pages/Receipts'))
const RecurringBills = lazyWithRetry(() => import('../features/finance/pages/RecurringBills'))
const ShoppingLists = lazyWithRetry(() => import('../features/shopping/pages/ShoppingLists'))
const EconomicNews = lazyWithRetry(() => import('../features/finance/pages/EconomicNews'))
const BankCallback = lazyWithRetry(() => import('../features/banking/pages/BankCallback'))
const Achievements = lazyWithRetry(() => import('../features/analytics/pages/Achievements'))
const PaireScore = lazyWithRetry(() => import('../features/analytics/pages/PaireScore'))
const WeeklyRecap = lazyWithRetry(() => import('../features/analytics/pages/WeeklyRecap'))
const PaireHome = lazyWithRetry(() => import('../features/gamification/pages/PaireHome'))
const Challenges = lazyWithRetry(() => import('../features/gamification/pages/Challenges'))
const YearInReview = lazyWithRetry(() => import('../features/analytics/pages/YearInReview'))
const CurrencyCalculator = lazyWithRetry(() => import('../features/finance/pages/CurrencyCalculator'))
const PrivacyPolicy = lazyWithRetry(() => import('../features/legal/pages/PrivacyPolicy'))
const TermsOfService = lazyWithRetry(() => import('../features/legal/pages/TermsOfService'))
const Landing = lazyWithRetry(() => import('../features/legal/pages/Landing'))

const LoadingFallback = () => <LogoLoader size="large" fullScreen />

export function MainAppRoutes({ session }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/confirm-email" element={<EmailConfirmation />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/bank-callback" element={<BankCallback />} />
        <Route path="/setup-2fa" element={!session ? <Navigate to="/login" /> : <TwoFactorSetup />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route
          path="/"
          element={
            (() => {
              if (session) return <Navigate to="/dashboard" />
              if (sessionStorage.getItem('auth_prevent_autologin')) return <Landing />
              const token = sessionManager.getToken()
              const user = sessionManager.getCurrentUser()
              if (token && user) {
                setTimeout(() => window.dispatchEvent(new CustomEvent('auth-storage-change')), 0)
                return <Navigate to="/dashboard" />
              }
              return <Landing />
            })()
          }
        />
        <Route
          element={
            (() => {
              if (session) return <Layout />
              if (sessionStorage.getItem('auth_prevent_autologin')) return <Navigate to="/login" />
              const token = sessionManager.getToken()
              const user = sessionManager.getCurrentUser()
              if (token && user) {
                setTimeout(() => window.dispatchEvent(new CustomEvent('auth-storage-change')), 0)
                return <Layout />
              }
              return <Navigate to="/login" />
            })()
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="transactions" element={<AllTransactions />} />
          <Route path="loans" element={<Loans />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="savings-goals" element={<SavingsGoals />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="recurring-bills" element={<RecurringBills />} />
          <Route path="shopping-lists" element={<ShoppingLists />} />
          <Route path="economic-news" element={<EconomicNews />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="paire-score" element={<PaireScore />} />
          <Route path="weekly-recap" element={<WeeklyRecap />} />
          <Route path="paire-home" element={<PaireHome />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="year-in-review" element={<YearInReview />} />
          <Route path="partnership" element={<Partnership />} />
          <Route path="reminders" element={<ReminderSettings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="currency-calculator" element={<CurrencyCalculator />} />
        </Route>
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} />} />
      </Routes>
    </Suspense>
  )
}
