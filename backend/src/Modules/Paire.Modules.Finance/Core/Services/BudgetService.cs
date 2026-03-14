using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.DTOs;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class BudgetService : IBudgetService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly ILogger<BudgetService> _logger;

    private const int WarningThreshold = 80;
    private const int ExceededThreshold = 100;

    public BudgetService(FinanceDbContext dbContext, IPartnershipResolver partnershipResolver, ILogger<BudgetService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<List<BudgetAlertDto>> UpdateSpentAmountAsync(string userId, string category, decimal amount, DateTime transactionDate)
    {
        var alerts = new List<BudgetAlertDto>();

        try
        {
            var dateUtc = transactionDate.Kind == DateTimeKind.Utc ? transactionDate : transactionDate.ToUniversalTime();
            var allUserIds = await GetHouseholdIdsAsync(userId);

            var budgets = await _dbContext.Budgets
                .Where(b => allUserIds.Contains(b.UserId)
                       && b.IsActive
                       && EF.Functions.ILike(b.Category, category))
                .ToListAsync();

            foreach (var budget in budgets)
            {
                bool isWithinPeriod = false;
                var budgetStart = budget.StartDate.Kind == DateTimeKind.Utc ? budget.StartDate : budget.StartDate.ToUniversalTime();
                var budgetEnd = budget.EndDate?.Kind == DateTimeKind.Utc ? budget.EndDate.Value : budget.EndDate?.ToUniversalTime();

                if (budget.Period.ToLower() == "monthly")
                {
                    isWithinPeriod = budgetEnd.HasValue
                        ? dateUtc >= budgetStart && dateUtc <= budgetEnd
                        : dateUtc.Month == budgetStart.Month && dateUtc.Year == budgetStart.Year;
                }
                else if (budget.Period.ToLower() == "yearly")
                {
                    isWithinPeriod = budgetEnd.HasValue
                        ? dateUtc >= budgetStart && dateUtc <= budgetEnd
                        : dateUtc.Year == budgetStart.Year;
                }
                else
                {
                    isWithinPeriod = budgetEnd.HasValue
                        ? dateUtc >= budgetStart && dateUtc <= budgetEnd
                        : dateUtc >= budgetStart;
                }

                if (isWithinPeriod)
                {
                    var previousPercentage = budget.Amount > 0 ? (int)Math.Round((budget.SpentAmount / budget.Amount) * 100) : 0;
                    budget.SpentAmount += amount;
                    budget.UpdatedAt = DateTime.UtcNow;
                    var newPercentage = budget.Amount > 0 ? (int)Math.Round((budget.SpentAmount / budget.Amount) * 100) : 0;

                    if (amount > 0)
                    {
                        if (previousPercentage < ExceededThreshold && newPercentage >= ExceededThreshold)
                        {
                            alerts.Add(new BudgetAlertDto
                            {
                                BudgetId = budget.Id, Category = budget.Category,
                                BudgetAmount = budget.Amount, SpentAmount = budget.SpentAmount,
                                PercentageUsed = newPercentage, AlertType = "exceeded"
                            });
                        }
                        else if (previousPercentage < WarningThreshold && newPercentage >= WarningThreshold)
                        {
                            alerts.Add(new BudgetAlertDto
                            {
                                BudgetId = budget.Id, Category = budget.Category,
                                BudgetAmount = budget.Amount, SpentAmount = budget.SpentAmount,
                                PercentageUsed = newPercentage, AlertType = "warning"
                            });
                        }
                    }
                }
            }

            if (budgets.Any()) await _dbContext.SaveChangesAsync();
            return alerts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating budget spent amount for user {UserId}, category {Category}", userId, category);
            return alerts;
        }
    }

    public async Task RecalculateBudgetAsync(Guid budgetId)
    {
        try
        {
            var budget = await _dbContext.Budgets.FindAsync(budgetId);
            if (budget == null) return;

            var budgetStart = budget.StartDate.Kind == DateTimeKind.Utc ? budget.StartDate : budget.StartDate.ToUniversalTime();
            var budgetEnd = budget.EndDate?.Kind == DateTimeKind.Utc ? budget.EndDate.Value : budget.EndDate?.ToUniversalTime();
            var allUserIds = await GetHouseholdIdsAsync(budget.UserId);

            var query = _dbContext.Transactions
                .Where(t => allUserIds.Contains(t.UserId)
                       && t.Type.ToLower() == "expense"
                       && EF.Functions.ILike(t.Category, budget.Category));

            if (budget.Period.ToLower() == "monthly")
            {
                if (budgetEnd.HasValue)
                    query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
                else
                {
                    var startOfMonth = new DateTime(budgetStart.Year, budgetStart.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);
                    query = query.Where(t => t.Date >= startOfMonth && t.Date <= endOfMonth);
                }
            }
            else if (budget.Period.ToLower() == "yearly")
            {
                if (budgetEnd.HasValue)
                    query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
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
                    query = query.Where(t => t.Date >= budgetStart && t.Date <= budgetEnd);
                else
                    query = query.Where(t => t.Date >= budgetStart);
            }

            var totalSpent = await query.SumAsync(t => t.Amount);
            budget.SpentAmount = totalSpent;
            budget.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recalculating budget {BudgetId}", budgetId);
        }
    }

    private async Task<List<string>> GetHouseholdIdsAsync(string userId)
    {
        try
        {
            return await _partnershipResolver.GetHouseholdUserIdsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
            return new List<string> { userId };
        }
    }
}
