using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class BudgetsAppService : IBudgetsAppService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    // TODO: Wire IAchievementService via integration event in Phase 6+
    private readonly ILogger<BudgetsAppService> _logger;

    public BudgetsAppService(
        FinanceDbContext dbContext,
        IPartnershipResolver partnershipResolver,
        ILogger<BudgetsAppService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<IEnumerable<object>> GetBudgetsWithProfilesAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());

        var budgets = await _dbContext.Budgets
            .AsNoTracking()
            .Where(b => allUserIds.Contains(b.UserId))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var userIds = budgets.Select(b => b.UserId).Distinct().ToList();
        var userProfiles = await _dbContext.UserProfiles
            .AsNoTracking()
            .Where(up => userIds.Contains(up.Id.ToString()))
            .ToListAsync();

        var profileDict = userProfiles.ToDictionary(
            p => p.Id.ToString(),
            p => new { id = p.Id, email = p.Email, display_name = p.DisplayName, avatar_url = p.AvatarUrl });

        return budgets.Select(b => new
        {
            id = b.Id, user_id = b.UserId, category = b.Category,
            amount = b.Amount, period = b.Period, spent_amount = b.SpentAmount,
            is_active = b.IsActive, start_date = b.StartDate, end_date = b.EndDate,
            created_at = b.CreatedAt, updated_at = b.UpdatedAt,
            user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null
        });
    }

    public async Task<Budget?> GetBudgetAsync(Guid userId, Guid id)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.Budgets.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));
    }

    public async Task<Budget> CreateBudgetAsync(Guid userId, Budget budget)
    {
        budget.Id = Guid.NewGuid();
        budget.UserId = userId.ToString();
        budget.CreatedAt = DateTime.UtcNow;
        budget.UpdatedAt = DateTime.UtcNow;

        if (budget.StartDate.Kind == DateTimeKind.Unspecified)
            budget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
        else if (budget.StartDate.Kind == DateTimeKind.Local)
            budget.StartDate = budget.StartDate.ToUniversalTime();

        if (budget.EndDate.HasValue)
        {
            if (budget.EndDate.Value.Kind == DateTimeKind.Unspecified)
                budget.EndDate = DateTime.SpecifyKind(budget.EndDate.Value, DateTimeKind.Utc);
            else if (budget.EndDate.Value.Kind == DateTimeKind.Local)
                budget.EndDate = budget.EndDate.Value.ToUniversalTime();
        }

        _dbContext.Budgets.Add(budget);
        await _dbContext.SaveChangesAsync();

        // TODO: Wire IAchievementService.CheckBudgetAchievementsAsync via integration event in Phase 6+

        return budget;
    }

    public async Task<Budget?> UpdateBudgetAsync(Guid userId, Guid id, Budget updates)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var existingBudget = await _dbContext.Budgets
            .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

        if (existingBudget == null) return null;

        existingBudget.Category = updates.Category;
        existingBudget.Amount = updates.Amount;
        existingBudget.Period = updates.Period;
        existingBudget.SpentAmount = updates.SpentAmount;
        existingBudget.IsActive = updates.IsActive;
        existingBudget.UpdatedAt = DateTime.UtcNow;

        if (updates.StartDate.Kind == DateTimeKind.Unspecified)
            existingBudget.StartDate = DateTime.SpecifyKind(updates.StartDate, DateTimeKind.Utc);
        else if (updates.StartDate.Kind == DateTimeKind.Local)
            existingBudget.StartDate = updates.StartDate.ToUniversalTime();
        else
            existingBudget.StartDate = updates.StartDate;

        if (updates.EndDate.HasValue)
        {
            if (updates.EndDate.Value.Kind == DateTimeKind.Unspecified)
                existingBudget.EndDate = DateTime.SpecifyKind(updates.EndDate.Value, DateTimeKind.Utc);
            else if (updates.EndDate.Value.Kind == DateTimeKind.Local)
                existingBudget.EndDate = updates.EndDate.Value.ToUniversalTime();
            else
                existingBudget.EndDate = updates.EndDate;
        }
        else
        {
            existingBudget.EndDate = null;
        }

        await _dbContext.SaveChangesAsync();
        return existingBudget;
    }

    public async Task<bool> DeleteBudgetAsync(Guid userId, Guid id)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var budget = await _dbContext.Budgets
            .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

        if (budget == null) return false;

        _dbContext.Budgets.Remove(budget);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<List<string>> GetHouseholdIdsAsync(string userId)
    {
        try { return await _partnershipResolver.GetHouseholdUserIdsAsync(userId); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
            return new List<string> { userId };
        }
    }
}
