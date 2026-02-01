/**
 * Widget System Index
 * 
 * Exports all dashboard widgets and widget registry.
 * Each widget has metadata: id, name, icon, description, defaultVisible.
 */

import { 
  Wallet, 
  PiggyBank, 
  Bell, 
  CreditCard, 
  Target,
  Zap,
} from 'lucide-react-native';

// Widget Components
export { default as SummaryWidget } from './SummaryWidget';
export { default as BudgetWidget } from './BudgetWidget';
export { default as UpcomingBillsWidget } from './UpcomingBillsWidget';
export { default as RecentTransactionsWidget } from './RecentTransactionsWidget';
export { default as SavingsWidget } from './SavingsWidget';
export { default as QuickAccessWidget } from './QuickAccessWidget';

// Widget Registry - defines all available widgets
export const WIDGET_REGISTRY = [
  {
    id: 'summary',
    name: 'widgets.summary.title',
    description: 'widgets.summary.description',
    icon: Wallet,
    defaultVisible: true,
    defaultOrder: 0,
  },
  {
    id: 'quickAccess',
    name: 'widgets.quickAccess.title',
    description: 'widgets.quickAccess.description',
    icon: Zap,
    defaultVisible: true,
    defaultOrder: 1,
  },
  {
    id: 'budgets',
    name: 'widgets.budgets.title',
    description: 'widgets.budgets.description',
    icon: Target,
    defaultVisible: true,
    defaultOrder: 2,
  },
  {
    id: 'upcomingBills',
    name: 'widgets.upcomingBills.title',
    description: 'widgets.upcomingBills.description',
    icon: Bell,
    defaultVisible: true,
    defaultOrder: 3,
  },
  {
    id: 'recentTransactions',
    name: 'widgets.recentTransactions.title',
    description: 'widgets.recentTransactions.description',
    icon: CreditCard,
    defaultVisible: true,
    defaultOrder: 4,
  },
  {
    id: 'savings',
    name: 'widgets.savings.title',
    description: 'widgets.savings.description',
    icon: PiggyBank,
    defaultVisible: false, // Hidden by default
    defaultOrder: 5,
  },
];

// Get default layout configuration
export function getDefaultWidgetLayout() {
  return WIDGET_REGISTRY.map(widget => ({
    id: widget.id,
    visible: widget.defaultVisible,
    order: widget.defaultOrder,
  }));
}

// Get widget by ID
export function getWidgetById(id) {
  return WIDGET_REGISTRY.find(w => w.id === id);
}
