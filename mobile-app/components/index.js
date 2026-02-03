/**
 * Shared UI components (React Native).
 * Barrel export for Phase A primitives and Phase B feature components.
 */

// Core UI Components
export { default as Modal } from './Modal';
export { default as Button } from './Button';
export { default as FormField } from './FormField';
export { default as Skeleton, SkeletonTransaction, SkeletonBudget, SkeletonWidget, SkeletonCard, SkeletonList } from './Skeleton';
export { ToastProvider, useToast, useToastHelpers } from './Toast';

// Navigation Components
export {
  BottomSheetMenu,
  QuickAddSheet,
  TabBarWithFAB,
  ScreenHeader,
  FinanceHubSheet,
  ToolsHubSheet,
  ExploreHubSheet,
  FINANCE_FEATURES,
  TOOLS_FEATURES,
  LIFESTYLE_FEATURES,
  ACCOUNT_FEATURES,
  QUICK_ADD_ACTIONS,
  NAVIGATION_CATEGORIES,
} from './navigation';

// Animated Components
export { default as AnimatedCard } from './AnimatedCard';
export { default as AnimatedPressable } from './AnimatedPressable';
export { default as AnimatedListItem } from './AnimatedListItem';
export { default as SuccessAnimation } from './SuccessAnimation';
export { default as SplashScreen } from './SplashScreen';

// Empty State
export { default as EmptyState } from './EmptyState';

// Screen loading (full-screen spinner + message)
export { default as ScreenLoading } from './ScreenLoading';

// Smart Suggestions Components
export { default as SmartCategorySuggestions } from './SmartCategorySuggestions';
export { default as DuplicateDetection } from './DuplicateDetection';
export { default as QuickFill } from './QuickFill';

// Calendar View
export { default as CalendarView } from './CalendarView';

// Widget System
export { default as WidgetSelector } from './WidgetSelector';
export {
  SummaryWidget,
  BudgetWidget,
  UpcomingBillsWidget,
  RecentTransactionsWidget,
  SavingsWidget,
  QuickAccessWidget,
  InsightsWidget,
  WIDGET_REGISTRY,
  getDefaultWidgetLayout,
  getWidgetById,
} from './widgets';

// Progress Bars
export { default as BudgetProgressBar } from './BudgetProgressBar';
export { default as SavingGoalProgressBar } from './SavingGoalProgressBar';

// Form Components
export { default as Dropdown } from './Dropdown';
export { default as CurrencyInput } from './CurrencyInput';
export { default as DateInput } from './DateInput';
export { default as DateRangePicker } from './DateRangePicker';
export { default as CategorySelector } from './CategorySelector';
export { default as FormSection } from './FormSection';
export { default as SearchInput } from './SearchInput';
export { default as ConfirmationModal } from './ConfirmationModal';

// Entity Forms
export { default as TransactionForm } from './TransactionForm';
export { default as BudgetForm } from './BudgetForm';
export { default as LoanForm } from './LoanForm';
export { default as SavingsGoalForm } from './SavingsGoalForm';
export { default as RecurringBillForm } from './RecurringBillForm';
export { default as ShoppingListForm } from './ShoppingListForm';
export { default as ShoppingItemForm } from './ShoppingItemForm';

// Global Calculator
export { default as GlobalCalculator } from './GlobalCalculator';
