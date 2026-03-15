using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Paire.Modules.Analytics.Core.Entities;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Infrastructure;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Analytics.Core.Services;

public class AchievementService : IAchievementService
{
    private readonly AnalyticsDbContext _analyticsContext;
    private readonly FinanceDbContext _financeContext;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly ILogger<AchievementService> _logger;

    public AchievementService(AnalyticsDbContext analyticsContext, FinanceDbContext financeContext, IPartnershipResolver partnershipResolver, ILogger<AchievementService> logger)
    {
        _analyticsContext = analyticsContext;
        _financeContext = financeContext;
        _partnershipResolver = partnershipResolver;
        _logger = logger;
    }

    public async Task<List<UserAchievement>> CheckTransactionAchievementsAsync(string userId) => await CheckCountAchievementsAsync(userId, "transactions", async () =>
    {
        var expenseCount = await _financeContext.Transactions.CountAsync(t => t.UserId == userId && t.Type.ToLower() == "expense");
        var incomeCount = await _financeContext.Transactions.CountAsync(t => t.UserId == userId && t.Type.ToLower() == "income");
        return new Dictionary<string, int> { ["expense"] = expenseCount, ["income"] = incomeCount };
    });

    public async Task<List<UserAchievement>> CheckBudgetAchievementsAsync(string userId) => await CheckCountAchievementsAsync(userId, "budgets", async () => new Dictionary<string, int> { ["budget"] = await _financeContext.Budgets.CountAsync(b => b.UserId == userId) });

    public async Task<List<UserAchievement>> CheckSavingsAchievementsAsync(string userId) => await CheckCountAchievementsAsync(userId, "savings", async () =>
    {
        var goals = await _financeContext.SavingsGoals.Where(g => g.UserId == userId).ToListAsync();
        return new Dictionary<string, int> { ["savings_goal"] = goals.Count, ["savings_goal_achieved"] = goals.Count(g => g.IsAchieved) };
    });

    public async Task<List<UserAchievement>> CheckLoanAchievementsAsync(string userId) => await CheckCountAchievementsAsync(userId, "loans", async () => new Dictionary<string, int> { ["loan_settled"] = await _financeContext.Loans.CountAsync(l => l.UserId == userId && l.IsSettled) });

    public async Task<List<UserAchievement>> CheckPartnershipAchievementsAsync(string userId)
    {
        var newAchievements = new List<UserAchievement>();
        var partnerId = await _partnershipResolver.GetPartnerUserIdAsync(userId);
        if (partnerId == null) return newAchievements;

        var achievements = await _analyticsContext.Achievements.Where(a => a.IsActive && a.Category == "partnership").ToListAsync();
        foreach (var achievement in achievements)
        {
            if (await _analyticsContext.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id)) continue;
            if (achievement.Code == "PARTNERSHIP_CREATED") { newAchievements.Add(await AwardAchievementAsync(userId, achievement.Id, 100)); }
        }
        return await SaveAchievementsAsync(newAchievements, userId);
    }

    public Task<List<UserAchievement>> CheckConsistencyAchievementsAsync(string userId) => Task.FromResult(new List<UserAchievement>());

    public async Task<List<UserAchievement>> CheckMilestoneAchievementsAsync(string userId) => await CheckCountAchievementsAsync(userId, "milestone", async () =>
    {
        var txCount = await _financeContext.Transactions.CountAsync(t => t.UserId == userId);
        return new Dictionary<string, int> { ["transaction"] = txCount };
    });

    public async Task<List<UserAchievement>> CheckAllAchievementsAsync(string userId)
    {
        var all = new List<UserAchievement>();
        all.AddRange(await CheckTransactionAchievementsAsync(userId));
        all.AddRange(await CheckBudgetAchievementsAsync(userId));
        all.AddRange(await CheckSavingsAchievementsAsync(userId));
        all.AddRange(await CheckLoanAchievementsAsync(userId));
        all.AddRange(await CheckPartnershipAchievementsAsync(userId));
        all.AddRange(await CheckMilestoneAchievementsAsync(userId));
        return all;
    }

    public async Task<List<UserAchievement>> GetUserAchievementsAsync(string userId) => await _analyticsContext.UserAchievements.Include(ua => ua.Achievement).Where(ua => ua.UserId == userId).OrderByDescending(ua => ua.UnlockedAt).ToListAsync();

    public async Task<List<AchievementProgressDto>> GetUserAchievementProgressAsync(string userId)
    {
        var achievements = await _analyticsContext.Achievements.Where(a => a.IsActive).OrderBy(a => a.SortOrder).ToListAsync();
        var userAchievements = await _analyticsContext.UserAchievements.Where(ua => ua.UserId == userId).ToDictionaryAsync(ua => ua.AchievementId);
        return achievements.Select(a => new AchievementProgressDto { Achievement = a, UserAchievement = userAchievements.GetValueOrDefault(a.Id), Progress = userAchievements.ContainsKey(a.Id) ? 100 : 0, IsUnlocked = userAchievements.ContainsKey(a.Id) }).ToList();
    }

    public async Task<List<UserAchievement>> GetUnnotifiedAchievementsAsync(string userId) => await _analyticsContext.UserAchievements.Include(ua => ua.Achievement).Where(ua => ua.UserId == userId && !ua.IsNotified).OrderByDescending(ua => ua.UnlockedAt).ToListAsync();

    public async Task MarkAchievementsAsNotifiedAsync(List<Guid> userAchievementIds)
    {
        var items = await _analyticsContext.UserAchievements.Where(ua => userAchievementIds.Contains(ua.Id)).ToListAsync();
        foreach (var item in items) item.IsNotified = true;
        await _analyticsContext.SaveChangesAsync();
    }

    public async Task<AchievementStatsDto> GetAchievementStatsAsync(string userId)
    {
        var all = await _analyticsContext.Achievements.Where(a => a.IsActive).ToListAsync();
        var unlocked = await _analyticsContext.UserAchievements.Where(ua => ua.UserId == userId).Include(ua => ua.Achievement).ToListAsync();
        return new AchievementStatsDto { Unlocked = unlocked.Count, Total = all.Count, TotalPoints = unlocked.Sum(ua => ua.Achievement?.Points ?? 0), Percentage = all.Count > 0 ? (double)unlocked.Count / all.Count * 100 : 0, ByCategory = unlocked.GroupBy(ua => ua.Achievement?.Category).Select(g => new AchievementCategoryCountDto { Category = g.Key, Count = g.Count() }).ToList(), ByRarity = unlocked.GroupBy(ua => ua.Achievement?.Rarity).Select(g => new AchievementRarityCountDto { Rarity = g.Key, Count = g.Count() }).ToList() };
    }

    public async Task InitializeDefaultAchievementsAsync()
    {
        var defaults = new List<Achievement>
        {
            new() { Code = "FIRST_EXPENSE", Name = "First Expense", Description = "Record your first expense", Category = "transactions", Icon = "FiTrendingDown", Color = "primary", Points = 10, Rarity = "common", CriteriaType = "count", CriteriaValue = JsonSerializer.Serialize(new { type = "expense", count = 1 }), SortOrder = 1 },
            new() { Code = "FIRST_BUDGET", Name = "Budget Planner", Description = "Create your first budget", Category = "budgets", Icon = "FiTarget", Color = "primary", Points = 20, Rarity = "common", CriteriaType = "count", CriteriaValue = JsonSerializer.Serialize(new { type = "budget", count = 1 }), SortOrder = 10 },
            new() { Code = "FIRST_SAVINGS_GOAL", Name = "Goal Setter", Description = "Create your first savings goal", Category = "savings", Icon = "FiPieChart", Color = "primary", Points = 20, Rarity = "common", CriteriaType = "count", CriteriaValue = JsonSerializer.Serialize(new { type = "savings_goal", count = 1 }), SortOrder = 20 },
            new() { Code = "PARTNERSHIP_CREATED", Name = "Together", Description = "Create a partnership", Category = "partnership", Icon = "FiUsers", Color = "primary", Points = 50, Rarity = "common", CriteriaType = "boolean", CriteriaValue = JsonSerializer.Serialize(new { type = "partnership" }), SortOrder = 40 }
        };
        var existing = await _analyticsContext.Achievements.Select(a => a.Code).ToListAsync();
        var toAdd = defaults.Where(d => !existing.Contains(d.Code)).ToList();
        foreach (var a in toAdd) a.Id = Guid.NewGuid();
        if (toAdd.Any()) { await _analyticsContext.Achievements.AddRangeAsync(toAdd); await _analyticsContext.SaveChangesAsync(); }
    }

    private async Task<List<UserAchievement>> CheckCountAchievementsAsync(string userId, string category, Func<Task<Dictionary<string, int>>> getStats)
    {
        var newAchievements = new List<UserAchievement>();
        var stats = await getStats();
        var achievements = await _analyticsContext.Achievements.Where(a => a.IsActive && a.Category == category && a.CriteriaType == "count").ToListAsync();
        foreach (var achievement in achievements)
        {
            if (await _analyticsContext.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == achievement.Id)) continue;
            var criteria = JsonSerializer.Deserialize<JsonObject>(achievement.CriteriaValue ?? "{}");
            var type = criteria?["type"]?.ToString() ?? "";
            var targetCount = criteria?["count"]?.GetValue<int>() ?? 0;
            var current = stats.GetValueOrDefault(type, 0);
            if (current >= targetCount) newAchievements.Add(await AwardAchievementAsync(userId, achievement.Id, 100));
        }
        return await SaveAchievementsAsync(newAchievements, userId);
    }

    private Task<UserAchievement> AwardAchievementAsync(string userId, Guid achievementId, decimal progress)
    {
        var ua = new UserAchievement { Id = Guid.NewGuid(), UserId = userId, AchievementId = achievementId, UnlockedAt = DateTime.UtcNow, Progress = progress, IsNotified = false, CreatedAt = DateTime.UtcNow };
        _analyticsContext.UserAchievements.Add(ua);
        return Task.FromResult(ua);
    }

    private async Task<List<UserAchievement>> SaveAchievementsAsync(List<UserAchievement> achievements, string userId)
    {
        if (achievements.Count == 0) return achievements;
        try { await _analyticsContext.SaveChangesAsync(); return achievements; }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
        {
            var saved = await _analyticsContext.UserAchievements.Where(ua => ua.UserId == userId && achievements.Select(a => a.AchievementId).Contains(ua.AchievementId)).Select(ua => ua.AchievementId).ToListAsync();
            return achievements.Where(a => saved.Contains(a.AchievementId)).ToList();
        }
    }
}
