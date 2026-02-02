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
    route: '/(app)/expenses',
    description: 'Track your spending',
  },
  {
    id: 'income',
    icon: TrendingUp,
    labelKey: 'navigation.income',
    route: '/(app)/income',
    description: 'Manage your income',
  },
  {
    id: 'budgets',
    icon: Wallet,
    labelKey: 'navigation.budgets',
    route: '/(app)/budgets',
    description: 'Set spending limits',
  },
  {
    id: 'savings',
    icon: PiggyBank,
    labelKey: 'navigation.savingsGoals',
    route: '/(app)/savings-goals',
    description: 'Track savings progress',
  },
  {
    id: 'loans',
    icon: CreditCard,
    labelKey: 'navigation.loans',
    route: '/(app)/loans',
    description: 'Manage loans & debts',
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
    route: '/(app)/analytics',
    description: 'Financial insights',
  },
  {
    id: 'calculator',
    icon: Calculator,
    labelKey: 'navigation.currencyCalculator',
    route: '/(app)/currency-calculator',
    description: 'Convert currencies',
  },
  {
    id: 'receipts',
    icon: Receipt,
    labelKey: 'receipts.title',
    route: '/(app)/receipts',
    description: 'Store receipts',
  },
  {
    id: 'bills',
    icon: Repeat,
    labelKey: 'navigation.recurringBills',
    route: '/(app)/recurring-bills',
    description: 'Track recurring bills',
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
    route: '/(app)/travel',
    description: 'Plan trips & budgets',
  },
  {
    id: 'shopping',
    icon: ShoppingCart,
    labelKey: 'navigation.shoppingLists',
    route: '/(app)/shopping-lists',
    description: 'Shopping lists',
  },
  {
    id: 'reminders',
    icon: Bell,
    labelKey: 'navigation.reminders',
    route: '/(app)/reminders',
    description: 'Payment reminders',
  },
  {
    id: 'news',
    icon: Newspaper,
    labelKey: 'navigation.economicNews',
    route: '/(app)/economic-news',
    description: 'Market news',
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
    route: '/(app)/partnership',
    description: 'Share with partner',
  },
  {
    id: 'linked',
    icon: Link2,
    labelKey: 'linkedAccounts.title',
    route: '/(app)/linked-accounts',
    description: 'Bank connections',
  },
  {
    id: 'achievements',
    icon: Trophy,
    labelKey: 'navigation.achievements',
    route: '/(app)/achievements',
    description: 'Your milestones',
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
