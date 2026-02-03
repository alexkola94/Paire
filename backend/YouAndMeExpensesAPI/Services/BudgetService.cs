using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class BudgetService : IBudgetService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<BudgetService> _logger;

        // Threshold percentages for alerts
        private const int WarningThreshold = 80;
        private const int ExceededThreshold = 100;

        public BudgetService(AppDbContext dbContext, ILogger<BudgetService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<List<BudgetAlertDto>> UpdateSpentAmountAsync(string userId, string category, decimal amount, DateTime transactionDate)
        {
            var alerts = new List<BudgetAlertDto>();

            try
            {
                // Ensure transaction date is UTC
                var dateUtc = transactionDate.Kind == DateTimeKind.Utc
                    ? transactionDate
                    : transactionDate.ToUniversalTime();

                // Get partner IDs to find shared budgets
                var partnerIds = await GetPartnerIdsAsync(Guid.Parse(userId));
                var allUserIds = new List<string> { userId };
                allUserIds.AddRange(partnerIds);

                // Find active budgets that match the criteria
                // Matching criteria:
                // 1. Belongs to user or partner
                // 2. Category matches (case-insensitive)
                // 3. Is Active
                // 4. Date falls within budget period
                
                var budgets = await _dbContext.Budgets
                    .Where(b => allUserIds.Contains(b.UserId) 
                           && b.IsActive 
                           && EF.Functions.ILike(b.Category, category))
                    .ToListAsync();

                foreach (var budget in budgets)
                {
                    bool isWithinPeriod = false;

                    // Ensure budget start/end dates are UTC for comparison
                    var budgetStart = budget.StartDate.Kind == DateTimeKind.Utc 
                        ? budget.StartDate 
                        : budget.StartDate.ToUniversalTime();
                        
                    var budgetEnd = budget.EndDate?.Kind == DateTimeKind.Utc
                        ? budget.EndDate.Value
                        : budget.EndDate?.ToUniversalTime();

                    if (budget.Period.ToLower() == "monthly")
                    {
                        // Check if transaction is in the same month/year as budget start
                        // OR if budget has specific date range
                        if (budgetEnd.HasValue)
                        {
                             isWithinPeriod = dateUtc >= budgetStart && dateUtc <= budgetEnd;
                        }
                        else
                        {
                            // Default monthly logic: Matches if transaction is in the same month as current budget period
                            // For simplicity, we assume budgets are created for the current month or represent a rolling monthly budget
                            // If it's a specific month budget (e.g., "Nov 2023"), checking Month/Year is safer
                            isWithinPeriod = dateUtc.Month == budgetStart.Month && dateUtc.Year == budgetStart.Year;
                        }
                    }
                    else if (budget.Period.ToLower() == "yearly")
                    {
                         if (budgetEnd.HasValue)
                        {
                             isWithinPeriod = dateUtc >= budgetStart && dateUtc <= budgetEnd;
                        }
                        else
                        {
                             isWithinPeriod = dateUtc.Year == budgetStart.Year;
                        }
                    }
                    else
                    {
                        // Custom period
                        if (budgetEnd.HasValue)
                        {
                            isWithinPeriod = dateUtc >= budgetStart && dateUtc <= budgetEnd;
                        }
                        else
                        {
                            // If no end date, just check start date
                             isWithinPeriod = dateUtc >= budgetStart;
                        }
                    }

                    if (isWithinPeriod)
                    {
                        // Track previous percentage to detect threshold crossings
                        var previousPercentage = budget.Amount > 0
                            ? (int)Math.Round((budget.SpentAmount / budget.Amount) * 100)
                            : 0;

                        budget.SpentAmount += amount;
                        budget.UpdatedAt = DateTime.UtcNow;

                        // Calculate new percentage
                        var newPercentage = budget.Amount > 0
                            ? (int)Math.Round((budget.SpentAmount / budget.Amount) * 100)
                            : 0;

                        _logger.LogInformation($"Updated budget {budget.Id} ({budget.Category}): Added {amount}. New Spent: {budget.SpentAmount} ({newPercentage}%)");

                        // Check if we crossed a threshold (only alert on increases, not decreases)
                        if (amount > 0)
                        {
                            // Check if we crossed the exceeded threshold (100%)
                            if (previousPercentage < ExceededThreshold && newPercentage >= ExceededThreshold)
                            {
                                alerts.Add(new BudgetAlertDto
                                {
                                    BudgetId = budget.Id,
                                    Category = budget.Category,
                                    BudgetAmount = budget.Amount,
                                    SpentAmount = budget.SpentAmount,
                                    PercentageUsed = newPercentage,
                                    AlertType = "exceeded"
                                });
                                _logger.LogWarning($"Budget {budget.Id} ({budget.Category}) EXCEEDED: {newPercentage}%");
                            }
                            // Check if we crossed the warning threshold (80%)
                            else if (previousPercentage < WarningThreshold && newPercentage >= WarningThreshold)
                            {
                                alerts.Add(new BudgetAlertDto
                                {
                                    BudgetId = budget.Id,
                                    Category = budget.Category,
                                    BudgetAmount = budget.Amount,
                                    SpentAmount = budget.SpentAmount,
                                    PercentageUsed = newPercentage,
                                    AlertType = "warning"
                                });
                                _logger.LogWarning($"Budget {budget.Id} ({budget.Category}) WARNING: {newPercentage}%");
                            }
                        }
                    }
                }

                if (budgets.Any())
                {
                    await _dbContext.SaveChangesAsync();
                }

                return alerts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating budget spent amount for User {UserId}, Category {Category}", userId, category);
                // We don't throw here to avoid failing the transaction creation if budget update fails
                return alerts;
            }
        }

        public async Task RecalculateBudgetAsync(Guid budgetId)
        {
            try
            {
                var budget = await _dbContext.Budgets.FindAsync(budgetId);
                if (budget == null) return;

                // Ensure budget dates are UTC
                var budgetStart = budget.StartDate.Kind == DateTimeKind.Utc 
                    ? budget.StartDate 
                    : budget.StartDate.ToUniversalTime();
                
                var budgetEnd = budget.EndDate?.Kind == DateTimeKind.Utc
                    ? budget.EndDate.Value
                    : budget.EndDate?.ToUniversalTime();

                // Get partner IDs
                var partnerIds = await GetPartnerIdsAsync(Guid.Parse(budget.UserId));
                var allUserIds = new List<string> { budget.UserId };
                allUserIds.AddRange(partnerIds);

                // Build query for transactions
                var query = _dbContext.Transactions
                    .Where(t => allUserIds.Contains(t.UserId) 
                           && t.Type.ToLower() == "expense"
                           && EF.Functions.ILike(t.Category, budget.Category));

                // Apply date filter based on period
                if (budget.Period.ToLower() == "monthly")
                {
                    if (budgetEnd.HasValue)
                    {
                         query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
                    }
                    else
                    {
                         // Start of month to End of month
                         var startOfMonth = new DateTime(budgetStart.Year, budgetStart.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                         var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);
                         query = query.Where(t => t.Date >= startOfMonth && t.Date <= endOfMonth);
                    }
                }
                else if (budget.Period.ToLower() == "yearly")
                {
                     if (budgetEnd.HasValue)
                    {
                         query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
                    }
                    else
                    {
                         var startOfYear = new DateTime(budgetStart.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                         var endOfYear = startOfYear.AddYears(1).AddTicks(-1);
                         query = query.Where(t => t.Date >= startOfYear && t.Date <= endOfYear);
                    }
                }
                else
                {
                     if (budgetEnd.HasValue)
                    {
                        query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
                    }
                    else
                    {
                        query = query.Where(t => t.Date >= budgetStart);
                    }
                }

                var totalSpent = await query.SumAsync(t => t.Amount);

                budget.SpentAmount = totalSpent;
                budget.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                _logger.LogInformation($"Recalculated budget {budget.Id}: Total Spent {totalSpent}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recalculating budget {BudgetId}", budgetId);
            }
        }

        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                var partnerId = partnership.User1Id == userId
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
