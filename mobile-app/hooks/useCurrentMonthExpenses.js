/**
 * useCurrentMonthExpenses
 *
 * Fetches current-month expense transactions and computes spent per category.
 * Aligns mobile with web: progress is based on current-month spending, not API spent_amount.
 * Shared query key so budgets screen and dashboard share cache.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/api';

const QUERY_KEY = ['transactions', 'current-month-expenses'];

function getCurrentMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
  };
}

/**
 * Build category -> total spent from expense list (same logic as web).
 * Uses category as returned by API for consistency.
 */
function buildSpentByCategory(expenses) {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {};
  }
  const map = {};
  for (const e of expenses) {
    const cat = e.category ?? '';
    const amount = Number(e.amount) || 0;
    map[cat] = (map[cat] ?? 0) + amount;
  }
  return map;
}

/**
 * Normalize API response to array (backend returns array when no page/pageSize).
 */
function normalizeToArray(data) {
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

export function useCurrentMonthExpenses() {
  const range = useMemo(() => getCurrentMonthRange(), []);

  const query = useQuery({
    queryKey: [...QUERY_KEY, range.startDate.slice(0, 7)],
    queryFn: async () => {
      const raw = await transactionService.getAll({
        type: 'expense',
        startDate: range.startDate,
        endDate: range.endDate,
      });
      return normalizeToArray(raw);
    },
  });

  const expenses = normalizeToArray(query.data);
  const spentByCategory = useMemo(() => buildSpentByCategory(expenses), [expenses]);

  return {
    expenses,
    spentByCategory,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export { QUERY_KEY as currentMonthExpensesQueryKey };
