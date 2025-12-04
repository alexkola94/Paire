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
        /// Get financial analytics for a date range
        /// </summary>
        public async Task<FinancialAnalyticsDTO> GetFinancialAnalyticsAsync(
            string userId, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogInformation("Calculating financial analytics for user {UserId}", userId);

                // Fetch transactions for the period
                var transactionList = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
                    .Where(t => t.Date >= startDate && t.Date <= endDate)
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
                var days = (endDate - startDate).Days + 1;
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
        /// Get loan analytics
        /// </summary>
        public async Task<LoanAnalyticsDTO> GetLoanAnalyticsAsync(
            string userId, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                _logger.LogInformation("Calculating loan analytics for user {UserId}", userId);

                // Fetch all loans
                var loansQuery = _dbContext.Loans.Where(l => l.UserId == userId);

                if (startDate.HasValue && endDate.HasValue)
                {
                    loansQuery = loansQuery.Where(l => l.Date >= startDate.Value && l.Date <= endDate.Value);
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
                    .Sum(l => CalculateInterest(l.Amount, l.InterestRate.Value, l.Date, DateTime.UtcNow));

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
                        DueDate = l.NextPaymentDate.Value,
                        DaysUntilDue = (l.NextPaymentDate.Value - DateTime.UtcNow).Days,
                        IsOverdue = l.NextPaymentDate.Value < DateTime.UtcNow
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

                // Fetch budgets
                var budgets = await _dbContext.Budgets
                    .Where(b => b.UserId == userId && b.IsActive)
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

                // Fetch savings goals
                var goals = await _dbContext.SavingsGoals
                    .Where(g => g.UserId == userId && !g.IsAchieved)
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

                // Fetch recurring bills
                var bills = await _dbContext.RecurringBills
                    .Where(b => b.UserId == userId && b.IsActive)
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

                // Fetch transactions
                var transactionList = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
                    .Where(t => t.Date >= startDate && t.Date <= endDate)
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

                // Current month transactions
                var currentMonth = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
                    .Where(t => t.Date >= currentMonthStart && t.Date <= currentMonthEnd)
                    .ToListAsync();

                var currentIncome = currentMonth.Where(t => t.Type == "income").Sum(t => t.Amount);
                var currentExpenses = currentMonth.Where(t => t.Type == "expense").Sum(t => t.Amount);

                // Last month expenses
                var lastMonth = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
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

                // Last 7 days trend
                var sevenDaysAgo = now.AddDays(-7);
                var last7Days = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
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

                // Active loans
                var loans = await _dbContext.Loans
                    .Where(l => l.UserId == userId && !l.IsSettled)
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
        private async Task<List<MonthlyComparison>> GetMonthlyComparisonAsync(string userId, int months)
        {
            var result = new List<MonthlyComparison>();
            var now = DateTime.UtcNow;

            for (int i = 0; i < months; i++)
            {
                var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                var transactions = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
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

            for (int i = months - 1; i >= 0; i--)
            {
                var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                var transactions = await _dbContext.Transactions
                    .Where(t => t.UserId == userId)
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
    }
}

