namespace YouAndMeExpensesAPI.DTOs
{
    /// <summary>
    /// Financial analytics response
    /// </summary>
    public class FinancialAnalyticsDTO
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal Balance { get; set; }
        public decimal AverageDailySpending { get; set; }
        public List<CategoryBreakdown> CategoryBreakdown { get; set; } = new();
        public List<TrendData> IncomeExpenseTrend { get; set; } = new();
        public List<MonthlyComparison> MonthlyComparison { get; set; } = new();
        public HighestExpense? HighestExpenseDay { get; set; }
    }

    /// <summary>
    /// Loan analytics response
    /// </summary>
    public class LoanAnalyticsDTO
    {
        public decimal TotalLoansGiven { get; set; }
        public decimal TotalLoansReceived { get; set; }
        public decimal TotalPaidBack { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal TotalInterestEarned { get; set; }
        public decimal TotalInterestPaid { get; set; }
        public int ActiveLoansCount { get; set; }
        public int SettledLoansCount { get; set; }
        public List<LoanPaymentSchedule> UpcomingPayments { get; set; } = new();
        public List<LoanSummary> LoansByCategory { get; set; } = new();
    }

    /// <summary>
    /// Household analytics response
    /// </summary>
    public class HouseholdAnalyticsDTO
    {
        public List<BudgetProgress> BudgetProgress { get; set; } = new();
        public List<SavingsGoalProgress> SavingsProgress { get; set; } = new();
        public List<RecurringBillSummary> UpcomingBills { get; set; } = new();
        public decimal TotalBudget { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal BudgetAdherence { get; set; } // Percentage
        public decimal TotalSavingsTarget { get; set; }
        public decimal TotalSavingsCurrent { get; set; }
    }

    /// <summary>
    /// Comparative analytics response
    /// </summary>
    public class ComparativeAnalyticsDTO
    {
        public List<PartnerSpending> PartnerComparison { get; set; } = new();
        public List<MonthOverMonth> MonthOverMonthTrend { get; set; } = new();
        public List<CategorySplit> CategorySplitByPartner { get; set; } = new();
        public List<WeeklyPattern> WeeklySpendingPattern { get; set; } = new();
    }

    /// <summary>
    /// Dashboard summary for quick widgets
    /// </summary>
    public class DashboardAnalyticsDTO
    {
        public decimal CurrentMonthIncome { get; set; }
        public decimal CurrentMonthExpenses { get; set; }
        public decimal CurrentMonthBalance { get; set; }
        public decimal LastMonthExpenses { get; set; }
        public decimal ChangePercentage { get; set; }
        public List<CategoryBreakdown> TopCategories { get; set; } = new();
        public List<TrendData> Last7DaysTrend { get; set; } = new();
        public int ActiveLoansCount { get; set; }
        public decimal TotalOutstandingLoans { get; set; }
    }

    // Supporting classes
    public class CategoryBreakdown
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal Percentage { get; set; }
        public int TransactionCount { get; set; }
    }

    public class TrendData
    {
        public DateTime Date { get; set; }
        public decimal Income { get; set; }
        public decimal Expenses { get; set; }
        public decimal Balance { get; set; }
    }

    public class MonthlyComparison
    {
        public string Month { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal Income { get; set; }
        public decimal Expenses { get; set; }
        public decimal Balance { get; set; }
    }

    public class HighestExpense
    {
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class LoanPaymentSchedule
    {
        public Guid LoanId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public int DaysUntilDue { get; set; }
        public bool IsOverdue { get; set; }
    }

    public class LoanSummary
    {
        public string Category { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public int Count { get; set; }
    }

    public class BudgetProgress
    {
        public string Category { get; set; } = string.Empty;
        public decimal Budgeted { get; set; }
        public decimal Spent { get; set; }
        public decimal Remaining { get; set; }
        public decimal Percentage { get; set; }
        public bool IsOverBudget { get; set; }
    }

    public class SavingsGoalProgress
    {
        public Guid GoalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TargetAmount { get; set; }
        public decimal CurrentAmount { get; set; }
        public decimal Percentage { get; set; }
        public DateTime? TargetDate { get; set; }
        public int? DaysRemaining { get; set; }
    }

    public class RecurringBillSummary
    {
        public Guid BillId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public int DaysUntilDue { get; set; }
        public bool IsOverdue { get; set; }
    }

    public class PartnerSpending
    {
        public string Partner { get; set; } = string.Empty;
        public decimal TotalSpent { get; set; }
        public decimal Percentage { get; set; }
        public int TransactionCount { get; set; }
    }

    public class MonthOverMonth
    {
        public string Period { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal Change { get; set; }
        public decimal ChangePercentage { get; set; }
    }

    public class CategorySplit
    {
        public string Category { get; set; } = string.Empty;
        public decimal Partner1Amount { get; set; }
        public decimal Partner2Amount { get; set; }
        public string Partner1Name { get; set; } = string.Empty;
        public string Partner2Name { get; set; } = string.Empty;
    }

    public class WeeklyPattern
    {
        public string DayOfWeek { get; set; } = string.Empty;
        public decimal AverageAmount { get; set; }
        public int TransactionCount { get; set; }
    }
}

