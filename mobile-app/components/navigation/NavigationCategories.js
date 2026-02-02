/**
 * Navigation Categories Configuration
 * 
 * Defines the feature groupings for the bottom sheet navigation system.
 * Each category contains related features with their icons, routes, and translations.
 */

import {
  TrendingDown, TrendingUp, Wallet, PiggyBank, CreditCard,
  BarChart3, Calculator, Receipt, Repeat,
  MapPin, ShoppingCart, Bell, Newspaper,
  Users, Link2, Trophy,
  Plus, Camera,
} from 'lucide-react-native';

/**
 * Finance Hub Features
 * Core financial tracking and management
 */
export const FINANCE_FEATURES = [
  {
    id: 'expenses',
    icon: TrendingDown,
    labelKey: 'navigation.expenses',
    descriptionKey: 'navigation.descriptions.trackSpending',
    route: '/(app)/expenses',
  },
  {
    id: 'income',
    icon: TrendingUp,
    labelKey: 'navigation.income',
    descriptionKey: 'navigation.descriptions.manageIncome',
    route: '/(app)/income',
  },
  {
    id: 'budgets',
    icon: Wallet,
    labelKey: 'navigation.budgets',
    descriptionKey: 'navigation.descriptions.setSpendingLimits',
    route: '/(app)/budgets',
  },
  {
    id: 'savings',
    icon: PiggyBank,
    labelKey: 'navigation.savingsGoals',
    descriptionKey: 'navigation.descriptions.trackSavingsProgress',
    route: '/(app)/savings-goals',
  },
  {
    id: 'loans',
    icon: CreditCard,
    labelKey: 'navigation.loans',
    descriptionKey: 'navigation.descriptions.manageLoansDebts',
    route: '/(app)/loans',
  },
];

/**
 * Tools Hub Features
 * Utilities and analytics
 */
export const TOOLS_FEATURES = [
  {
    id: 'analytics',
    icon: BarChart3,
    labelKey: 'navigation.analytics',
    descriptionKey: 'navigation.descriptions.financialInsights',
    route: '/(app)/(tabs)/analytics',
  },
  {
    id: 'calculator',
    icon: Calculator,
    labelKey: 'navigation.currencyCalculator',
    descriptionKey: 'navigation.descriptions.convertCurrencies',
    route: '/(app)/currency-calculator',
  },
  {
    id: 'receipts',
    icon: Receipt,
    labelKey: 'receipts.title',
    descriptionKey: 'navigation.descriptions.storeReceipts',
    route: '/(app)/receipts',
  },
  {
    id: 'bills',
    icon: Repeat,
    labelKey: 'navigation.recurringBills',
    descriptionKey: 'navigation.descriptions.trackRecurringBills',
    route: '/(app)/recurring-bills',
  },
];

/**
 * Lifestyle Hub Features
 * Additional features for daily life
 */
export const LIFESTYLE_FEATURES = [
  {
    id: 'travel',
    icon: MapPin,
    labelKey: 'travel.common.enterTravelMode',
    descriptionKey: 'navigation.descriptions.planTripsBudgets',
    route: '/(app)/travel',
  },
  {
    id: 'shopping',
    icon: ShoppingCart,
    labelKey: 'navigation.shoppingLists',
    descriptionKey: 'navigation.descriptions.shoppingLists',
    route: '/(app)/shopping-lists',
  },
  {
    id: 'reminders',
    icon: Bell,
    labelKey: 'navigation.reminders',
    descriptionKey: 'navigation.descriptions.paymentReminders',
    route: '/(app)/reminders',
  },
  {
    id: 'news',
    icon: Newspaper,
    labelKey: 'navigation.economicNews',
    descriptionKey: 'navigation.descriptions.marketNews',
    route: '/(app)/economic-news',
  },
];

/**
 * Account Hub Features
 * User settings and social features
 */
export const ACCOUNT_FEATURES = [
  {
    id: 'partnership',
    icon: Users,
    labelKey: 'navigation.partnership',
    descriptionKey: 'navigation.descriptions.shareWithPartner',
    route: '/(app)/partnership',
  },
  {
    id: 'linked',
    icon: Link2,
    labelKey: 'linkedAccounts.title',
    descriptionKey: 'navigation.descriptions.bankConnections',
    route: '/(app)/linked-accounts',
  },
  {
    id: 'achievements',
    icon: Trophy,
    labelKey: 'navigation.achievements',
    descriptionKey: 'navigation.descriptions.yourMilestones',
    route: '/(app)/achievements',
  },
];

/**
 * Quick Add Actions
 * Actions available from the FAB (transfer removed for cleaner UX)
 */
export const QUICK_ADD_ACTIONS = [
  {
    id: 'expense',
    icon: TrendingDown,
    labelKey: 'quickAdd.addExpense',
    action: 'add-expense',
    primary: true,
    color: 'error', // Red for expenses
  },
  {
    id: 'income',
    icon: TrendingUp,
    labelKey: 'quickAdd.addIncome',
    action: 'add-income',
    color: 'success', // Green for income
  },
  {
    id: 'receipt',
    icon: Camera,
    labelKey: 'quickAdd.scanReceipt',
    action: 'scan-receipt',
    color: 'primary',
  },
];

/**
 * All navigation categories with metadata
 */
export const NAVIGATION_CATEGORIES = {
  finance: {
    id: 'finance',
    titleKey: 'navigation.categories.finance',
    features: FINANCE_FEATURES,
    icon: Wallet,
  },
  tools: {
    id: 'tools',
    titleKey: 'navigation.categories.tools',
    features: TOOLS_FEATURES,
    icon: BarChart3,
  },
  lifestyle: {
    id: 'lifestyle',
    titleKey: 'navigation.categories.lifestyle',
    features: LIFESTYLE_FEATURES,
    icon: MapPin,
  },
  account: {
    id: 'account',
    titleKey: 'navigation.categories.account',
    features: ACCOUNT_FEATURES,
    icon: Users,
  },
};

export default {
  FINANCE_FEATURES,
  TOOLS_FEATURES,
  LIFESTYLE_FEATURES,
  ACCOUNT_FEATURES,
  QUICK_ADD_ACTIONS,
  NAVIGATION_CATEGORIES,
};
