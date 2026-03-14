using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.DTOs;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Analytics.Core.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(
        FinanceDbContext dbContext,
        IPartnershipResolver partnershipResolver,
        ILogger<AnalyticsService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    private static DateTime ToUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc) return value;
        if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    public async Task<FinancialAnalyticsDTO> GetFinancialAnalyticsAsync(string userId, DateTime startDate, DateTime endDate)
    {
        _logger.LogInformation("Calculating financial analytics for user {UserId}", userId);
        var startUtc = ToUtc(startDate);
        var endUtc = ToUtc(endDate);
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var transactionList = await _dbContext.Transactions
            .Where(t => allUserIds.Contains(t.UserId) && t.Date >= startUtc && t.Date <= endUtc)
            .ToListAsync();

        var totalIncome = transactionList.Where(t => t.Type == "income").Sum(t => t.Amount);
        var totalExpenses = transactionList.Where(t => t.Type == "expense").Sum(t => t.Amount);
        var balance = totalIncome - totalExpenses;
        var days = (endUtc - startUtc).Days + 1;
        var avgDailySpending = days > 0 ? totalExpenses / days : 0;

        var categoryBreakdown = transactionList
            .Where(t => t.Type == "expense")
            .GroupBy(t => t.Category)
            .Select(g => new CategoryBreakdown
            {
                Category = g.Key,
                Amount = g.Sum(t => t.Amount),
                Percentage = totalExpenses > 0 ? (g.Sum(t => t.Amount) / totalExpenses) * 100 : 0,
                TransactionCount = g.Count()
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        var trendData = transactionList
            .GroupBy(t => t.Date.Date)
            .Select(g => new TrendData
            {
                Date = g.Key,
                Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - g.Where(t => t.Type == "expense").Sum(t => t.Amount)
            })
            .OrderBy(t => t.Date)
            .ToList();

        var monthlyComparison = await GetMonthlyComparisonAsync(userId, 6);
        var highestExpense = transactionList.Where(t => t.Type == "expense").OrderByDescending(t => t.Amount).FirstOrDefault();

        return new FinancialAnalyticsDTO
        {
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            Balance = balance,
            AverageDailySpending = avgDailySpending,
            CategoryBreakdown = categoryBreakdown,
            IncomeExpenseTrend = trendData,
            MonthlyComparison = monthlyComparison,
            HighestExpenseDay = highestExpense != null ? new HighestExpense { Date = highestExpense.Date, Amount = highestExpense.Amount, Description = highestExpense.Description ?? "" } : null
        };
    }

    public async Task<FinancialMonthSummaryDTO> GetFinancialMonthSummaryAsync(string userId, int year, int month)
    {
        if (month < 1 || month > 12) throw new ArgumentOutOfRangeException(nameof(month), "Month must be between 1 and 12.");
        var targetMonthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var targetMonthEnd = targetMonthStart.AddMonths(1).AddDays(-1);
        var windowStart = targetMonthStart.AddDays(-10);
        var windowEnd = targetMonthEnd.AddDays(10);
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var transactions = await _dbContext.Transactions
            .Where(t => allUserIds.Contains(t.UserId) && t.Date >= windowStart && t.Date <= windowEnd)
            .ToListAsync();

        decimal income = 0, expenses = 0;
        foreach (var t in transactions)
        {
            var effectiveMonth = GetEffectiveMonthForTransaction(t);
            if (effectiveMonth.Year != year || effectiveMonth.Month != month) continue;
            if (t.Type == "income") income += t.Amount;
            else if (t.Type == "expense") expenses += t.Amount;
        }
        return new FinancialMonthSummaryDTO { Year = year, Month = month, Income = income, Expenses = expenses, Balance = income - expenses };
    }

    public async Task<LoanAnalyticsDTO> GetLoanAnalyticsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);
        var loansQuery = _dbContext.Loans.Where(l => allUserIds.Contains(l.UserId));
        if (startDate.HasValue && endDate.HasValue)
        {
            var startUtc = ToUtc(startDate.Value);
            var endUtc = ToUtc(endDate.Value);
            loansQuery = loansQuery.Where(l => l.Date >= startUtc && l.Date <= endUtc);
        }
        var loanList = await loansQuery.ToListAsync();

        var totalGiven = loanList.Where(l => !string.IsNullOrEmpty(l.LentBy)).Sum(l => l.Amount);
        var totalReceived = loanList.Where(l => !string.IsNullOrEmpty(l.BorrowedBy)).Sum(l => l.Amount);
        var totalPaid = loanList.Sum(l => l.TotalPaid);
        var totalOutstanding = loanList.Where(l => !l.IsSettled).Sum(l => l.RemainingAmount);
        var totalInterestEarned = loanList.Where(l => l.InterestRate.HasValue).Sum(l => CalculateInterest(l.Amount, l.InterestRate!.Value, l.Date, DateTime.UtcNow));

        var upcomingPayments = loanList
            .Where(l => !l.IsSettled && l.NextPaymentDate.HasValue)
            .OrderBy(l => l.NextPaymentDate)
            .Take(10)
            .Select(l => new LoanPaymentSchedule
            {
                LoanId = l.Id,
                Description = l.Description ?? $"{l.LentBy} to {l.BorrowedBy}",
                Amount = l.InstallmentAmount ?? l.RemainingAmount,
                DueDate = l.NextPaymentDate!.Value,
                DaysUntilDue = (l.NextPaymentDate!.Value - DateTime.UtcNow).Days,
                IsOverdue = l.NextPaymentDate!.Value < DateTime.UtcNow
            })
            .ToList();

        var loansByCategory = loanList
            .Where(l => !string.IsNullOrEmpty(l.Category))
            .GroupBy(l => l.Category)
            .Select(g => new LoanSummary { Category = g.Key ?? "Uncategorized", TotalAmount = g.Sum(l => l.Amount), PaidAmount = g.Sum(l => l.TotalPaid), RemainingAmount = g.Sum(l => l.RemainingAmount), Count = g.Count() })
            .ToList();

        return new LoanAnalyticsDTO
        {
            TotalLoansGiven = totalGiven,
            TotalLoansReceived = totalReceived,
            TotalPaidBack = totalPaid,
            TotalOutstanding = totalOutstanding,
            TotalInterestEarned = totalInterestEarned,
            TotalInterestPaid = 0,
            ActiveLoansCount = loanList.Count(l => !l.IsSettled),
            SettledLoansCount = loanList.Count(l => l.IsSettled),
            UpcomingPayments = upcomingPayments,
            LoansByCategory = loansByCategory
        };
    }

    public async Task<HouseholdAnalyticsDTO> GetHouseholdAnalyticsAsync(string userId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);
        var budgets = await _dbContext.Budgets.Where(b => allUserIds.Contains(b.UserId) && b.IsActive).ToListAsync();
        var goals = await _dbContext.SavingsGoals.Where(g => allUserIds.Contains(g.UserId) && !g.IsAchieved).ToListAsync();
        var bills = await _dbContext.RecurringBills.Where(b => allUserIds.Contains(b.UserId) && b.IsActive).ToListAsync();

        var budgetProgress = budgets.Select(b => new BudgetProgress { Category = b.Category, Budgeted = b.Amount, Spent = b.SpentAmount, Remaining = b.Amount - b.SpentAmount, Percentage = b.Amount > 0 ? (b.SpentAmount / b.Amount) * 100 : 0, IsOverBudget = b.SpentAmount > b.Amount }).ToList();
        var savingsProgress = goals.Select(g => new SavingsGoalProgress { GoalId = g.Id, Name = g.Name, TargetAmount = g.TargetAmount, CurrentAmount = g.CurrentAmount, Percentage = g.TargetAmount > 0 ? (g.CurrentAmount / g.TargetAmount) * 100 : 0, TargetDate = g.TargetDate, DaysRemaining = g.TargetDate.HasValue ? (g.TargetDate.Value - DateTime.UtcNow).Days : null }).ToList();
        var upcomingBills = bills.OrderBy(b => b.NextDueDate).Take(10).Select(b => new RecurringBillSummary { BillId = b.Id, Name = b.Name, Amount = b.Amount, DueDate = b.NextDueDate, DaysUntilDue = (b.NextDueDate - DateTime.UtcNow).Days, IsOverdue = b.NextDueDate < DateTime.UtcNow }).ToList();

        return new HouseholdAnalyticsDTO
        {
            BudgetProgress = budgetProgress,
            SavingsProgress = savingsProgress,
            UpcomingBills = upcomingBills,
            TotalBudget = budgets.Sum(b => b.Amount),
            TotalSpent = budgets.Sum(b => b.SpentAmount),
            BudgetAdherence = budgets.Sum(b => b.Amount) > 0 ? (budgets.Sum(b => b.SpentAmount) / budgets.Sum(b => b.Amount)) * 100 : 0,
            TotalSavingsTarget = goals.Sum(g => g.TargetAmount),
            TotalSavingsCurrent = goals.Sum(g => g.CurrentAmount)
        };
    }

    public async Task<ComparativeAnalyticsDTO> GetComparativeAnalyticsAsync(string userId, DateTime startDate, DateTime endDate)
    {
        var startUtc = ToUtc(startDate);
        var endUtc = ToUtc(endDate);
        var allUserIds = await GetHouseholdUserIdsAsync(userId);
        var transactionList = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= startUtc && t.Date <= endUtc).ToListAsync();

        var totalExpenses = transactionList.Where(t => t.Type == "expense").Sum(t => t.Amount);
        var partnerComparison = transactionList.Where(t => t.Type == "expense" && !string.IsNullOrEmpty(t.PaidBy)).GroupBy(t => t.PaidBy).Select(g => new PartnerSpending { Partner = g.Key ?? "Unknown", TotalSpent = g.Sum(t => t.Amount), Percentage = totalExpenses > 0 ? (g.Sum(t => t.Amount) / totalExpenses) * 100 : 0, TransactionCount = g.Count() }).ToList();
        var monthOverMonth = await GetMonthOverMonthTrendAsync(userId, 6);
        var categorySplit = transactionList.Where(t => t.Type == "expense" && !string.IsNullOrEmpty(t.PaidBy)).GroupBy(t => t.Category).Select(g => { var partners = g.GroupBy(t => t.PaidBy).ToList(); return new CategorySplit { Category = g.Key, Partner1Name = partners.ElementAtOrDefault(0)?.Key ?? "", Partner1Amount = partners.ElementAtOrDefault(0)?.Sum(t => t.Amount) ?? 0, Partner2Name = partners.ElementAtOrDefault(1)?.Key ?? "", Partner2Amount = partners.ElementAtOrDefault(1)?.Sum(t => t.Amount) ?? 0 }; }).ToList();
        var weeklyPattern = transactionList.Where(t => t.Type == "expense").GroupBy(t => t.Date.DayOfWeek).Select(g => new WeeklyPattern { DayOfWeek = g.Key.ToString(), AverageAmount = g.Average(t => t.Amount), TransactionCount = g.Count() }).OrderBy(w => (int)Enum.Parse<DayOfWeek>(w.DayOfWeek)).ToList();

        return new ComparativeAnalyticsDTO { PartnerComparison = partnerComparison, MonthOverMonthTrend = monthOverMonth, CategorySplitByPartner = categorySplit, WeeklySpendingPattern = weeklyPattern };
    }

    public async Task<DashboardAnalyticsDTO> GetDashboardAnalyticsAsync(string userId)
    {
        var now = DateTime.UtcNow;
        var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var currentMonthEnd = currentMonthStart.AddMonths(1).AddDays(-1);
        var lastMonthStart = currentMonthStart.AddMonths(-1);
        var lastMonthEnd = currentMonthStart.AddDays(-1);
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var currentMonth = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= currentMonthStart && t.Date <= currentMonthEnd).ToListAsync();
        var lastMonth = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= lastMonthStart && t.Date <= lastMonthEnd).ToListAsync();
        var currentIncome = currentMonth.Where(t => t.Type == "income").Sum(t => t.Amount);
        var currentExpenses = currentMonth.Where(t => t.Type == "expense").Sum(t => t.Amount);
        var lastExpenses = lastMonth.Where(t => t.Type == "expense").Sum(t => t.Amount);
        var changePercentage = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;

        var topCategories = currentMonth.Where(t => t.Type == "expense").GroupBy(t => t.Category).Select(g => new CategoryBreakdown { Category = g.Key, Amount = g.Sum(t => t.Amount), Percentage = currentExpenses > 0 ? (g.Sum(t => t.Amount) / currentExpenses) * 100 : 0, TransactionCount = g.Count() }).OrderByDescending(c => c.Amount).Take(5).ToList();
        var sevenDaysAgo = now.AddDays(-7);
        var last7Days = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= sevenDaysAgo).ToListAsync();
        var last7DaysTrend = last7Days.GroupBy(t => t.Date.Date).Select(g => new TrendData { Date = g.Key, Income = g.Where(t => t.Type == "income").Sum(t => t.Amount), Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount), Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - g.Where(t => t.Type == "expense").Sum(t => t.Amount) }).OrderBy(t => t.Date).ToList();
        var loans = await _dbContext.Loans.Where(l => allUserIds.Contains(l.UserId) && !l.IsSettled).ToListAsync();

        return new DashboardAnalyticsDTO { CurrentMonthIncome = currentIncome, CurrentMonthExpenses = currentExpenses, CurrentMonthBalance = currentIncome - currentExpenses, LastMonthExpenses = lastExpenses, ChangePercentage = changePercentage, TopCategories = topCategories, Last7DaysTrend = last7DaysTrend, ActiveLoansCount = loans.Count, TotalOutstandingLoans = loans.Sum(l => l.RemainingAmount) };
    }

    private static DateTime GetEffectiveMonthForTransaction(Transaction t)
    {
        var dateUtc = t.Date.Kind == DateTimeKind.Utc ? t.Date : (t.Date.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(t.Date, DateTimeKind.Utc) : t.Date.ToUniversalTime());
        var notes = t.Notes ?? "";
        const string duePrefix = "[Due:";
        if (notes.Contains("[RecurringBill:") && notes.Contains(duePrefix))
        {
            var dueStart = notes.IndexOf(duePrefix, StringComparison.Ordinal);
            if (dueStart >= 0) { dueStart += duePrefix.Length; var dueEnd = notes.IndexOf(']', dueStart); if (dueEnd > dueStart) { var dueStr = notes.Substring(dueStart, dueEnd - dueStart); if (DateTime.TryParseExact(dueStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dueDate)) return new DateTime(dueDate.Year, dueDate.Month, 1, 0, 0, 0, DateTimeKind.Utc); } }
        }
        const string salaryForPrefix = "[SalaryFor:";
        if (!string.IsNullOrEmpty(notes)) { var salaryStart = notes.IndexOf(salaryForPrefix, StringComparison.Ordinal); if (salaryStart >= 0) { salaryStart += salaryForPrefix.Length; var salaryEnd = notes.IndexOf(']', salaryStart); if (salaryEnd > salaryStart) { var ym = notes.Substring(salaryStart, salaryEnd - salaryStart); var parts = ym.Split('-', StringSplitOptions.RemoveEmptyEntries); if (parts.Length == 2 && int.TryParse(parts[0], out var y) && int.TryParse(parts[1], out var m) && m >= 1 && m <= 12) return new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc); } } }
        if (string.Equals(t.Type, "income", StringComparison.OrdinalIgnoreCase) && string.Equals(t.Category, "salary", StringComparison.OrdinalIgnoreCase))
        {
            var monthStart = new DateTime(dateUtc.Year, dateUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            if ((monthEnd.Date - dateUtc.Date).TotalDays <= 3) return monthStart.AddMonths(1);
        }
        return new DateTime(dateUtc.Year, dateUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private async Task<List<MonthlyComparison>> GetMonthlyComparisonAsync(string userId, int months)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);
        var now = DateTime.UtcNow;
        var result = new List<MonthlyComparison>();
        for (int i = 0; i < months; i++)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var transactions = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= monthStart && t.Date <= monthEnd).ToListAsync();
            result.Add(new MonthlyComparison { Month = monthStart.ToString("MMMM"), Year = monthStart.Year, Income = transactions.Where(t => t.Type == "income").Sum(t => t.Amount), Expenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount), Balance = transactions.Where(t => t.Type == "income").Sum(t => t.Amount) - transactions.Where(t => t.Type == "expense").Sum(t => t.Amount) });
        }
        return result.OrderBy(m => m.Year).ThenBy(m => DateTime.ParseExact(m.Month, "MMMM", null).Month).ToList();
    }

    private async Task<List<MonthOverMonth>> GetMonthOverMonthTrendAsync(string userId, int months)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);
        var now = DateTime.UtcNow;
        decimal previousAmount = 0;
        var result = new List<MonthOverMonth>();
        for (int i = months - 1; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var transactions = await _dbContext.Transactions.Where(t => allUserIds.Contains(t.UserId) && t.Date >= monthStart && t.Date <= monthEnd).ToListAsync();
            var amount = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
            var change = amount - previousAmount;
            result.Add(new MonthOverMonth { Period = monthStart.ToString("MMM yyyy"), Amount = amount, Change = change, ChangePercentage = previousAmount > 0 ? (change / previousAmount) * 100 : 0 });
            previousAmount = amount;
        }
        return result;
    }

    private static decimal CalculateInterest(decimal principal, decimal annualRate, DateTime startDate, DateTime endDate) => principal * (annualRate / 100) * ((endDate - startDate).Days / 365.0m);

    private async Task<List<string>> GetHouseholdUserIdsAsync(string userId)
    {
        try { return await _partnershipResolver.GetHouseholdUserIdsAsync(userId); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting household IDs for user: {UserId}", userId); return new List<string> { userId }; }
    }
}
