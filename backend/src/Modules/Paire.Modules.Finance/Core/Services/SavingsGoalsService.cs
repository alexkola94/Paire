using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Finance.Core.Services;

public class SavingsGoalsService : ISavingsGoalsService
{
    private readonly FinanceDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    // TODO: Wire IAchievementService via integration event in Phase 6+
    private readonly ILogger<SavingsGoalsService> _logger;

    public SavingsGoalsService(FinanceDbContext dbContext, IPartnershipResolver partnershipResolver, ILogger<SavingsGoalsService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<IReadOnlyList<object>> GetSavingsGoalsAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());

        var goals = await _dbContext.SavingsGoals
            .Where(g => allUserIds.Contains(g.UserId))
            .OrderByDescending(g => g.Priority == "high")
            .ThenByDescending(g => g.Priority == "medium")
            .ThenBy(g => g.TargetDate)
            .AsNoTracking()
            .ToListAsync();

        var userIds = goals.Select(g => g.UserId).Distinct().ToList();
        var userProfiles = await _dbContext.UserProfiles
            .Where(up => userIds.Contains(up.Id.ToString()))
            .AsNoTracking()
            .ToListAsync();

        var profileDict = userProfiles.ToDictionary(
            p => p.Id.ToString(),
            p => new { id = p.Id, email = p.Email, display_name = p.DisplayName, avatar_url = p.AvatarUrl });

        return goals.Select(g => new
        {
            id = g.Id, userId = g.UserId, name = g.Name,
            targetAmount = g.TargetAmount, currentAmount = g.CurrentAmount,
            priority = g.Priority, category = g.Category, icon = g.Icon, color = g.Color,
            notes = g.Notes, targetDate = g.TargetDate, isAchieved = g.IsAchieved,
            createdAt = g.CreatedAt, updatedAt = g.UpdatedAt,
            user_profiles = profileDict.ContainsKey(g.UserId) ? profileDict[g.UserId] : null
        }).Cast<object>().ToList();
    }

    public async Task<SavingsGoal?> GetSavingsGoalAsync(Guid userId, Guid goalId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        return await _dbContext.SavingsGoals.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));
    }

    public async Task<SavingsGoal> CreateSavingsGoalAsync(Guid userId, SavingsGoal goal)
    {
        goal.Id = Guid.NewGuid();
        goal.UserId = userId.ToString();
        goal.CreatedAt = DateTime.UtcNow;
        goal.UpdatedAt = DateTime.UtcNow;
        goal.IsAchieved = false;

        if (goal.TargetDate.HasValue) goal.TargetDate = NormalizeToUtc(goal.TargetDate.Value);
        if (string.IsNullOrEmpty(goal.Priority)) goal.Priority = "medium";

        _dbContext.SavingsGoals.Add(goal);
        await _dbContext.SaveChangesAsync();

        // TODO: Wire IAchievementService.CheckSavingsAchievementsAsync via integration event in Phase 6+

        return goal;
    }

    public async Task<SavingsGoal?> UpdateSavingsGoalAsync(Guid userId, Guid goalId, SavingsGoal updates)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var existingGoal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));

        if (existingGoal == null) return null;

        existingGoal.Name = updates.Name;
        existingGoal.TargetAmount = updates.TargetAmount;
        existingGoal.CurrentAmount = updates.CurrentAmount;
        existingGoal.Priority = updates.Priority;
        existingGoal.Category = updates.Category;
        existingGoal.Icon = updates.Icon;
        existingGoal.Color = updates.Color;
        existingGoal.Notes = updates.Notes;
        existingGoal.UpdatedAt = DateTime.UtcNow;
        existingGoal.IsAchieved = existingGoal.CurrentAmount >= existingGoal.TargetAmount || updates.IsAchieved;
        existingGoal.TargetDate = updates.TargetDate.HasValue ? NormalizeToUtc(updates.TargetDate.Value) : null;

        await _dbContext.SaveChangesAsync();
        return existingGoal;
    }

    public async Task<bool> DeleteSavingsGoalAsync(Guid userId, Guid goalId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var goal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));
        if (goal == null) return false;

        _dbContext.SavingsGoals.Remove(goal);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<SavingsGoal?> AddDepositAsync(Guid userId, Guid goalId, decimal amount)
    {
        var goal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId.ToString());
        if (goal == null) return null;

        goal.CurrentAmount += amount;
        goal.UpdatedAt = DateTime.UtcNow;
        if (goal.CurrentAmount >= goal.TargetAmount) goal.IsAchieved = true;

        await _dbContext.SaveChangesAsync();

        // TODO: Wire IAchievementService via integration event in Phase 6+

        return goal;
    }

    public async Task<SavingsGoal?> WithdrawAsync(Guid userId, Guid goalId, decimal amount)
    {
        var goal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId.ToString());
        if (goal == null) return null;
        if (goal.CurrentAmount - amount < 0) throw new InvalidOperationException("Insufficient funds in savings goal");

        goal.CurrentAmount -= amount;
        goal.UpdatedAt = DateTime.UtcNow;
        if (goal.CurrentAmount < goal.TargetAmount) goal.IsAchieved = false;

        await _dbContext.SaveChangesAsync();
        return goal;
    }

    public async Task<object> GetSummaryAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdIdsAsync(userId.ToString());
        var goals = await _dbContext.SavingsGoals
            .Where(g => allUserIds.Contains(g.UserId))
            .AsNoTracking()
            .ToListAsync();

        var totalTarget = goals.Sum(g => g.TargetAmount);
        var totalCurrent = goals.Sum(g => g.CurrentAmount);

        return new
        {
            totalGoals = goals.Count,
            activeGoals = goals.Count(g => !g.IsAchieved),
            achievedGoals = goals.Count(g => g.IsAchieved),
            totalTargetAmount = totalTarget,
            totalCurrentAmount = totalCurrent,
            totalRemaining = goals.Where(g => !g.IsAchieved).Sum(g => g.TargetAmount - g.CurrentAmount),
            overallProgress = totalTarget > 0 ? Math.Round((totalCurrent / totalTarget) * 100, 2) : 0,
            highPriorityGoals = goals.Count(g => g.Priority == "high" && !g.IsAchieved),
            mediumPriorityGoals = goals.Count(g => g.Priority == "medium" && !g.IsAchieved),
            lowPriorityGoals = goals.Count(g => g.Priority == "low" && !g.IsAchieved)
        };
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

    private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value.ToUniversalTime()
    };
}
