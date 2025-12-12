/**
 * Master list of categories used across the application
 * (Expenses, Budgets, Recurring Bills, Savings Goals, Shopping Lists)
 */
export const CATEGORIES = {
    EXPENSE: [
        'food',
        'transportation',
        'housing',
        'utilities',
        'entertainment',
        'healthcare',
        'shopping',
        'education',
        'personal',
        'groceries',
        'household',
        'electronics',
        'clothing',
        'insurance',
        'subscription',
        'rent',
        'loan',
        'internet',
        'phone',
        'gym',
        'gift',
        'other'
    ],
    INCOME: [
        'salary',
        'freelance',
        'investment',
        'gift',
        'other'
    ],
    // Subsets for specific dropdowns if needed, or just use EXPENSE for all
    // For Bills, we might want a subset, but for "Sync" to work best, 
    // allowing all categories is safer.
};

// Flattened list for easy checking
export const ALL_CATEGORIES = [...new Set([...CATEGORIES.EXPENSE, ...CATEGORIES.INCOME])];
