using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Analytics service for calculating financial insights
    /// Uses Entity Framework Core for data access
    /// </summary>
    public class AnalyticsService : IAnalyticsService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<AnalyticsService> _logger;

        public AnalyticsService(AppDbContext dbContext, ILogger<AnalyticsService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Normalize DateTime to UTC for PostgreSQL (timestamp with time zone).
        /// </summary>
        private static DateTime ToUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        /// <summary>
        /// Get financial analytics for a date range
        /// </summary>
        public async Task<FinancialAnalyticsDTO> GetFinancialAnalyticsAsync(
            string userId, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogInformation("Calculating financial analytics for user {UserId}", userId);

                var startUtc = ToUtc(startDate);
                var endUtc = ToUtc(endDate);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Fetch transactions for the period (from user and partner)
                var transactionList = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= startUtc && t.Date <= endUtc)
                    .ToListAsync();

                // Calculate totals
                var totalIncome = transactionList
                    .Where(t => t.Type == "income")
                    .Sum(t => t.Amount);

                var totalExpenses = transactionList
                    .Where(t => t.Type == "expense")
                    .Sum(t => t.Amount);

                var balance = totalIncome - totalExpenses;

                // Calculate average daily spending
                var days = (endUtc - startUtc).Days + 1;
                var avgDailySpending = days > 0 ? totalExpenses / days : 0;

                // Category breakdown
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

                // Income/Expense trend by day
                var trendData = transactionList
                    .GroupBy(t => t.Date.Date)
                    .Select(g => new TrendData
                    {
                        Date = g.Key,
                        Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                        Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                        Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - 
                                 g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                    })
                    .OrderBy(t => t.Date)
                    .ToList();

                // Monthly comparison (last 6 months)
                var monthlyComparison = await GetMonthlyComparisonAsync(userId, 6);

                // Highest expense day
                var highestExpense = transactionList
                    .Where(t => t.Type == "expense")
                    .OrderByDescending(t => t.Amount)
                    .FirstOrDefault();

                return new FinancialAnalyticsDTO
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    Balance = balance,
                    AverageDailySpending = avgDailySpending,
                    CategoryBreakdown = categoryBreakdown,
                    IncomeExpenseTrend = trendData,
                    MonthlyComparison = monthlyComparison,
                    HighestExpenseDay = highestExpense != null ? new HighestExpense
                    {
                        Date = highestExpense.Date,
                        Amount = highestExpense.Amount,
                        Description = highestExpense.Description ?? ""
                    } : null
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating financial analytics");
                throw;
            }
        }

        /// <summary>
        /// Get a simple income/expense summary for a given financial month,
        /// using \"effective month\" logic:
        /// - Recurring bill payments are grouped by their tagged due month.
        /// - Salary income near month-end can be shifted to the next month.
        /// </summary>
        public async Task<FinancialMonthSummaryDTO> GetFinancialMonthSummaryAsync(string userId, int year, int month)
        {
            try
            {
                _logger.LogInformation("Calculating financial month summary for user {UserId}, {Year}-{Month}", userId, year, month);

                if (month < 1 || month > 12)
                {
                    throw new ArgumentOutOfRangeException(nameof(month), "Month must be between 1 and 12.");
                }

                var targetMonthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var targetMonthEnd = targetMonthStart.AddMonths(1).AddDays(-1);

                // Small window around the target month to capture end-of-previous-month salary
                // and early/late payments that conceptually belong to this month.
                var windowStart = targetMonthStart.AddDays(-10);
                var windowEnd = targetMonthEnd.AddDays(10);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                var transactions = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= windowStart && t.Date <= windowEnd)
                    .ToListAsync();

                decimal income = 0;
                decimal expenses = 0;

                foreach (var t in transactions)
                {
                    var effectiveMonth = GetEffectiveMonthForTransaction(t);
                    if (effectiveMonth.Year != year || effectiveMonth.Month != month)
                    {
                        continue;
                    }

                    if (t.Type == "income")
                    {
                        income += t.Amount;
                    }
                    else if (t.Type == "expense")
                    {
                        expenses += t.Amount;
                    }
                }

                return new FinancialMonthSummaryDTO
                {
                    Year = year,
                    Month = month,
                    Income = income,
                    Expenses = expenses,
                    Balance = income - expenses
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating financial month summary");
                throw;
            }
        }

        /// <summary>
        /// Get loan analytics
        /// </summary>
        public async Task<LoanAnalyticsDTO> GetLoanAnalyticsAsync(
            string userId, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                _logger.LogInformation("Calculating loan analytics for user {UserId}", userId);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Fetch all loans (from user and partner)
                var loansQuery = _dbContext.Loans.Where(l => allUserIds.Contains(l.UserId));

                if (startDate.HasValue && endDate.HasValue)
                {
                    var startUtc = ToUtc(startDate.Value);
                    var endUtc = ToUtc(endDate.Value);
                    loansQuery = loansQuery.Where(l => l.Date >= startUtc && l.Date <= endUtc);
                }

                var loanList = await loansQuery.ToListAsync();

                // Calculate totals
                var totalGiven = loanList.Where(l => l.LentBy != null).Sum(l => l.Amount);
                var totalReceived = loanList.Where(l => l.BorrowedBy != null).Sum(l => l.Amount);
                var totalPaid = loanList.Sum(l => l.TotalPaid);
                var totalOutstanding = loanList.Where(l => !l.IsSettled).Sum(l => l.RemainingAmount);

                // Calculate interest
                var totalInterestEarned = loanList
                    .Where(l => l.InterestRate.HasValue)
                    .Sum(l => CalculateInterest(l.Amount, l.InterestRate!.Value, l.Date, DateTime.UtcNow));

                var activeCount = loanList.Count(l => !l.IsSettled);
                var settledCount = loanList.Count(l => l.IsSettled);

                // Upcoming payments
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

                // Loans by category
                var loansByCategory = loanList
                    .Where(l => !string.IsNullOrEmpty(l.Category))
                    .GroupBy(l => l.Category)
                    .Select(g => new LoanSummary
                    {
                        Category = g.Key ?? "Uncategorized",
                        TotalAmount = g.Sum(l => l.Amount),
                        PaidAmount = g.Sum(l => l.TotalPaid),
                        RemainingAmount = g.Sum(l => l.RemainingAmount),
                        Count = g.Count()
                    })
                    .ToList();

                return new LoanAnalyticsDTO
                {
                    TotalLoansGiven = totalGiven,
                    TotalLoansReceived = totalReceived,
                    TotalPaidBack = totalPaid,
                    TotalOutstanding = totalOutstanding,
                    TotalInterestEarned = totalInterestEarned,
                    TotalInterestPaid = 0, // Calculate if tracking borrowed loans with interest
                    ActiveLoansCount = activeCount,
                    SettledLoansCount = settledCount,
                    UpcomingPayments = upcomingPayments,
                    LoansByCategory = loansByCategory
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating loan analytics");
                throw;
            }
        }

        /// <summary>
        /// Get household analytics
        /// </summary>
        public async Task<HouseholdAnalyticsDTO> GetHouseholdAnalyticsAsync(string userId)
        {
            try
            {
                _logger.LogInformation("Calculating household analytics for user {UserId}", userId);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Fetch budgets (from user and partner)
                var budgets = await _dbContext.Budgets
                    .Where(b => allUserIds.Contains(b.UserId) && b.IsActive)
                    .ToListAsync();

                var budgetProgress = budgets.Select(b => new BudgetProgress
                {
                    Category = b.Category,
                    Budgeted = b.Amount,
                    Spent = b.SpentAmount,
                    Remaining = b.Amount - b.SpentAmount,
                    Percentage = b.Amount > 0 ? (b.SpentAmount / b.Amount) * 100 : 0,
                    IsOverBudget = b.SpentAmount > b.Amount
                }).ToList();

                // Fetch savings goals (from user and partner)
                var goals = await _dbContext.SavingsGoals
                    .Where(g => allUserIds.Contains(g.UserId) && !g.IsAchieved)
                    .ToListAsync();

                var savingsProgress = goals.Select(g => new SavingsGoalProgress
                {
                    GoalId = g.Id,
                    Name = g.Name,
                    TargetAmount = g.TargetAmount,
                    CurrentAmount = g.CurrentAmount,
                    Percentage = g.TargetAmount > 0 ? (g.CurrentAmount / g.TargetAmount) * 100 : 0,
                    TargetDate = g.TargetDate,
                    DaysRemaining = g.TargetDate.HasValue ? (g.TargetDate.Value - DateTime.UtcNow).Days : null
                }).ToList();

                // Fetch recurring bills (from user and partner)
                var bills = await _dbContext.RecurringBills
                    .Where(b => allUserIds.Contains(b.UserId) && b.IsActive)
                    .ToListAsync();

                var upcomingBills = bills
                    .OrderBy(b => b.NextDueDate)
                    .Take(10)
                    .Select(b => new RecurringBillSummary
                    {
                        BillId = b.Id,
                        Name = b.Name,
                        Amount = b.Amount,
                        DueDate = b.NextDueDate,
                        DaysUntilDue = (b.NextDueDate - DateTime.UtcNow).Days,
                        IsOverdue = b.NextDueDate < DateTime.UtcNow
                    })
                    .ToList();

                var totalBudget = budgets.Sum(b => b.Amount);
                var totalSpent = budgets.Sum(b => b.SpentAmount);
                var totalSavingsTarget = goals.Sum(g => g.TargetAmount);
                var totalSavingsCurrent = goals.Sum(g => g.CurrentAmount);

                return new HouseholdAnalyticsDTO
                {
                    BudgetProgress = budgetProgress,
                    SavingsProgress = savingsProgress,
                    UpcomingBills = upcomingBills,
                    TotalBudget = totalBudget,
                    TotalSpent = totalSpent,
                    BudgetAdherence = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                    TotalSavingsTarget = totalSavingsTarget,
                    TotalSavingsCurrent = totalSavingsCurrent
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating household analytics");
                throw;
            }
        }

        /// <summary>
        /// Get comparative analytics
        /// </summary>
        public async Task<ComparativeAnalyticsDTO> GetComparativeAnalyticsAsync(
            string userId, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogInformation("Calculating comparative analytics for user {UserId}", userId);

                var startUtc = ToUtc(startDate);
                var endUtc = ToUtc(endDate);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Fetch transactions (from user and partner)
                var transactionList = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= startUtc && t.Date <= endUtc)
                    .ToListAsync();

                // Partner comparison
                var partnerComparison = transactionList
                    .Where(t => t.Type == "expense" && !string.IsNullOrEmpty(t.PaidBy))
                    .GroupBy(t => t.PaidBy)
                    .Select(g => {
                        var total = transactionList.Where(t => t.Type == "expense").Sum(t => t.Amount);
                        return new PartnerSpending
                        {
                            Partner = g.Key ?? "Unknown",
                            TotalSpent = g.Sum(t => t.Amount),
                            Percentage = total > 0 ? (g.Sum(t => t.Amount) / total) * 100 : 0,
                            TransactionCount = g.Count()
                        };
                    })
                    .ToList();

                // Month over month trend
                var monthOverMonth = await GetMonthOverMonthTrendAsync(userId, 6);

                // Category split by partner
                var categorySplit = transactionList
                    .Where(t => t.Type == "expense" && !string.IsNullOrEmpty(t.PaidBy))
                    .GroupBy(t => t.Category)
                    .Select(g => {
                        var partners = g.GroupBy(t => t.PaidBy).ToList();
                        return new CategorySplit
                        {
                            Category = g.Key,
                            Partner1Name = partners.ElementAtOrDefault(0)?.Key ?? "",
                            Partner1Amount = partners.ElementAtOrDefault(0)?.Sum(t => t.Amount) ?? 0,
                            Partner2Name = partners.ElementAtOrDefault(1)?.Key ?? "",
                            Partner2Amount = partners.ElementAtOrDefault(1)?.Sum(t => t.Amount) ?? 0
                        };
                    })
                    .ToList();

                // Weekly spending pattern
                var weeklyPattern = transactionList
                    .Where(t => t.Type == "expense")
                    .GroupBy(t => t.Date.DayOfWeek)
                    .Select(g => new WeeklyPattern
                    {
                        DayOfWeek = g.Key.ToString(),
                        AverageAmount = g.Average(t => t.Amount),
                        TransactionCount = g.Count()
                    })
                    .OrderBy(w => (int)Enum.Parse<DayOfWeek>(w.DayOfWeek))
                    .ToList();

                return new ComparativeAnalyticsDTO
                {
                    PartnerComparison = partnerComparison,
                    MonthOverMonthTrend = monthOverMonth,
                    CategorySplitByPartner = categorySplit,
                    WeeklySpendingPattern = weeklyPattern
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating comparative analytics");
                throw;
            }
        }

        /// <summary>
        /// Get dashboard analytics summary
        /// </summary>
        public async Task<DashboardAnalyticsDTO> GetDashboardAnalyticsAsync(string userId)
        {
            try
            {
                _logger.LogInformation("Calculating dashboard analytics for user {UserId}", userId);

                var now = DateTime.UtcNow;
                var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var currentMonthEnd = currentMonthStart.AddMonths(1).AddDays(-1);
                var lastMonthStart = currentMonthStart.AddMonths(-1);
                var lastMonthEnd = currentMonthStart.AddDays(-1);

                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Current month transactions (from user and partner)
                var currentMonth = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= currentMonthStart && t.Date <= currentMonthEnd)
                    .ToListAsync();

                var currentIncome = currentMonth.Where(t => t.Type == "income").Sum(t => t.Amount);
                var currentExpenses = currentMonth.Where(t => t.Type == "expense").Sum(t => t.Amount);

                // Last month expenses (from user and partner)
                var lastMonth = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= lastMonthStart && t.Date <= lastMonthEnd)
                    .ToListAsync();

                var lastExpenses = lastMonth.Where(t => t.Type == "expense").Sum(t => t.Amount);
                var changePercentage = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;

                // Top categories
                var topCategories = currentMonth
                    .Where(t => t.Type == "expense")
                    .GroupBy(t => t.Category)
                    .Select(g => new CategoryBreakdown
                    {
                        Category = g.Key,
                        Amount = g.Sum(t => t.Amount),
                        Percentage = currentExpenses > 0 ? (g.Sum(t => t.Amount) / currentExpenses) * 100 : 0,
                        TransactionCount = g.Count()
                    })
                    .OrderByDescending(c => c.Amount)
                    .Take(5)
                    .ToList();

                // Last 7 days trend (from user and partner)
                var sevenDaysAgo = now.AddDays(-7);
                var last7Days = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= sevenDaysAgo)
                    .ToListAsync();

                var last7DaysTrend = last7Days
                    .GroupBy(t => t.Date.Date)
                    .Select(g => new TrendData
                    {
                        Date = g.Key,
                        Income = g.Where(t => t.Type == "income").Sum(t => t.Amount),
                        Expenses = g.Where(t => t.Type == "expense").Sum(t => t.Amount),
                        Balance = g.Where(t => t.Type == "income").Sum(t => t.Amount) - 
                                 g.Where(t => t.Type == "expense").Sum(t => t.Amount)
                    })
                    .OrderBy(t => t.Date)
                    .ToList();

                // Active loans (from user and partner)
                var loans = await _dbContext.Loans
                    .Where(l => allUserIds.Contains(l.UserId) && !l.IsSettled)
                    .ToListAsync();

                return new DashboardAnalyticsDTO
                {
                    CurrentMonthIncome = currentIncome,
                    CurrentMonthExpenses = currentExpenses,
                    CurrentMonthBalance = currentIncome - currentExpenses,
                    LastMonthExpenses = lastExpenses,
                    ChangePercentage = changePercentage,
                    TopCategories = topCategories,
                    Last7DaysTrend = last7DaysTrend,
                    ActiveLoansCount = loans.Count,
                    TotalOutstandingLoans = loans.Sum(l => l.RemainingAmount)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating dashboard analytics");
                throw;
            }
        }

        // Helper methods
        private static DateTime GetEffectiveMonthForTransaction(Transaction t)
        {
            // Default effective month is based on the transaction date
            var dateUtc = t.Date.Kind == DateTimeKind.Utc
                ? t.Date
                : (t.Date.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(t.Date, DateTimeKind.Utc)
                    : t.Date.ToUniversalTime());

            var notes = t.Notes ?? string.Empty;

            // 1) Recurring bill payments tagged with [RecurringBill:...][Due:YYYY-MM-DD]
            const string duePrefix = "[Due:";
            if (notes.Contains("[RecurringBill:") && notes.Contains(duePrefix))
            {
                var dueStart = notes.IndexOf(duePrefix, StringComparison.Ordinal);
                if (dueStart >= 0)
                {
                    dueStart += duePrefix.Length;
                    var dueEnd = notes.IndexOf(']', dueStart);
                    if (dueEnd > dueStart)
                    {
                        var dueStr = notes.Substring(dueStart, dueEnd - dueStart);
                        if (DateTime.TryParseExact(dueStr, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
                                out var dueDate))
                        {
                            return new DateTime(dueDate.Year, dueDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                        }
                    }
                }
            }

            // 2) Optional explicit salary tag [SalaryFor:YYYY-MM]
            const string salaryForPrefix = "[SalaryFor:";
            if (!string.IsNullOrEmpty(notes))
            {
                var salaryStart = notes.IndexOf(salaryForPrefix, StringComparison.Ordinal);
                if (salaryStart >= 0)
                {
                    salaryStart += salaryForPrefix.Length;
                    var salaryEnd = notes.IndexOf(']', salaryStart);
                    if (salaryEnd > salaryStart)
                    {
                        var ym = notes.Substring(salaryStart, salaryEnd - salaryStart);
                        var parts = ym.Split('-', StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length == 2 &&
                            int.TryParse(parts[0], out var y) &&
                            int.TryParse(parts[1], out var m) &&
                            m >= 1 && m <= 12)
                        {
                            return new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
                        }
                    }
                }
            }

            // 3) Salary near end-of-month: shift to next month
            if (string.Equals(t.Type, "income", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(t.Category, "salary", StringComparison.OrdinalIgnoreCase))
            {
                var monthStart = new DateTime(dateUtc.Year, dateUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                var daysUntilEnd = (monthEnd.Date - dateUtc.Date).TotalDays;

                // If salary is paid within the last 3 days of the month, treat it as covering next month
                if (daysUntilEnd <= 3)
                {
                    var nextMonthStart = monthStart.AddMonths(1);
                    return nextMonthStart;
                }
            }

            // Fallback: calendar month of transaction date
            return new DateTime(dateUtc.Year, dateUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        private async Task<List<MonthlyComparison>> GetMonthlyComparisonAsync(string userId, int months)
        {
            var result = new List<MonthlyComparison>();
            var now = DateTime.UtcNow;

            // Get partner IDs once (outside the loop for efficiency)
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId };
            allUserIds.AddRange(partnerIds);

            for (int i = 0; i < months; i++)
            {
                var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                var transactions = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= monthStart && t.Date <= monthEnd)
                    .ToListAsync();

                var income = transactions.Where(t => t.Type == "income").Sum(t => t.Amount);
                var expenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);

                result.Add(new MonthlyComparison
                {
                    Month = monthStart.ToString("MMMM"),
                    Year = monthStart.Year,
                    Income = income,
                    Expenses = expenses,
                    Balance = income - expenses
                });
            }

            return result.OrderBy(m => m.Year).ThenBy(m => DateTime.ParseExact(m.Month, "MMMM", null).Month).ToList();
        }

        private async Task<List<MonthOverMonth>> GetMonthOverMonthTrendAsync(string userId, int months)
        {
            var result = new List<MonthOverMonth>();
            var now = DateTime.UtcNow;
            decimal previousAmount = 0;

            // Get partner IDs once (outside the loop for efficiency)
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId };
            allUserIds.AddRange(partnerIds);

            for (int i = months - 1; i >= 0; i--)
            {
                var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                var transactions = await _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId))
                    .Where(t => t.Date >= monthStart && t.Date <= monthEnd)
                    .ToListAsync();

                var amount = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
                var change = amount - previousAmount;
                var changePercentage = previousAmount > 0 ? (change / previousAmount) * 100 : 0;

                result.Add(new MonthOverMonth
                {
                    Period = monthStart.ToString("MMM yyyy"),
                    Amount = amount,
                    Change = change,
                    ChangePercentage = changePercentage
                });

                previousAmount = amount;
            }

            return result;
        }

        private decimal CalculateInterest(decimal principal, decimal annualRate, DateTime startDate, DateTime endDate)
        {
            var days = (endDate - startDate).Days;
            var years = days / 365.0m;
            return principal * (annualRate / 100) * years;
        }

        /// <summary>
        /// Helper method to get partner user IDs for the current user
        /// </summary>
        /// <param name="userId">Current user ID</param>
        /// <returns>List of partner user IDs as strings</returns>
        private async Task<List<string>> GetPartnerIdsAsync(string userId)
        {
            try
            {
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return new List<string>();
                }

                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userIdGuid || p.User2Id == userIdGuid) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                // Return the partner's ID
                var partnerId = partnership.User1Id == userIdGuid
                    ? partnership.User2Id
                    : partnership.User1Id;

                return new List<string> { partnerId.ToString() };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
                return new List<string>();
            }
        }
    }
}

