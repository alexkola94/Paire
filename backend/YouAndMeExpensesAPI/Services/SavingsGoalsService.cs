using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for savings goals: encapsulates EF queries, partner resolution,
    /// deposits/withdrawals and summary calculations.
    /// </summary>
    public class SavingsGoalsService : ISavingsGoalsService
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<SavingsGoalsService> _logger;

        public SavingsGoalsService(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<SavingsGoalsService> logger)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<object>> GetSavingsGoalsAsync(Guid userId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

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
                p => new
                {
                    id = p.Id,
                    email = p.Email,
                    display_name = p.DisplayName,
                    avatar_url = p.AvatarUrl
                });

            var enrichedGoals = goals
                .Select(g => new
                {
                    id = g.Id,
                    userId = g.UserId,
                    name = g.Name,
                    targetAmount = g.TargetAmount,
                    currentAmount = g.CurrentAmount,
                    priority = g.Priority,
                    category = g.Category,
                    icon = g.Icon,
                    color = g.Color,
                    notes = g.Notes,
                    targetDate = g.TargetDate,
                    isAchieved = g.IsAchieved,
                    createdAt = g.CreatedAt,
                    updatedAt = g.UpdatedAt,
                    user_profiles = profileDict.ContainsKey(g.UserId) ? profileDict[g.UserId] : null
                })
                .Cast<object>()
                .ToList();

            return enrichedGoals;
        }

        public async Task<SavingsGoal?> GetSavingsGoalAsync(Guid userId, Guid goalId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            return await _dbContext.SavingsGoals
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));
        }

        public async Task<SavingsGoal> CreateSavingsGoalAsync(Guid userId, SavingsGoal goal)
        {
            goal.Id = Guid.NewGuid();
            goal.UserId = userId.ToString();
            goal.CreatedAt = DateTime.UtcNow;
            goal.UpdatedAt = DateTime.UtcNow;
            goal.IsAchieved = false;

            if (goal.TargetDate.HasValue)
            {
                goal.TargetDate = NormalizeToUtc(goal.TargetDate.Value);
            }

            if (string.IsNullOrEmpty(goal.Priority))
            {
                goal.Priority = "medium";
            }

            _dbContext.SavingsGoals.Add(goal);
            await _dbContext.SaveChangesAsync();

            await SafeCheckSavingsAchievementsAsync(userId, includeMilestones: false);

            return goal;
        }

        public async Task<SavingsGoal?> UpdateSavingsGoalAsync(Guid userId, Guid goalId, SavingsGoal updates)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var existingGoal = await _dbContext.SavingsGoals
                .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));

            if (existingGoal == null)
            {
                return null;
            }

            existingGoal.Name = updates.Name;
            existingGoal.TargetAmount = updates.TargetAmount;
            existingGoal.CurrentAmount = updates.CurrentAmount;
            existingGoal.Priority = updates.Priority;
            existingGoal.Category = updates.Category;
            existingGoal.Icon = updates.Icon;
            existingGoal.Color = updates.Color;
            existingGoal.Notes = updates.Notes;
            existingGoal.UpdatedAt = DateTime.UtcNow;

            if (existingGoal.CurrentAmount >= existingGoal.TargetAmount)
            {
                existingGoal.IsAchieved = true;
            }
            else
            {
                existingGoal.IsAchieved = updates.IsAchieved;
            }

            if (updates.TargetDate.HasValue)
            {
                existingGoal.TargetDate = NormalizeToUtc(updates.TargetDate.Value);
            }
            else
            {
                existingGoal.TargetDate = null;
            }

            await _dbContext.SaveChangesAsync();

            return existingGoal;
        }

        public async Task<bool> DeleteSavingsGoalAsync(Guid userId, Guid goalId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var goal = await _dbContext.SavingsGoals
                .FirstOrDefaultAsync(g => g.Id == goalId && allUserIds.Contains(g.UserId));

            if (goal == null)
            {
                return false;
            }

            _dbContext.SavingsGoals.Remove(goal);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<SavingsGoal?> AddDepositAsync(Guid userId, Guid goalId, decimal amount)
        {
            var goal = await _dbContext.SavingsGoals
                .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId.ToString());

            if (goal == null)
            {
                return null;
            }

            goal.CurrentAmount += amount;
            goal.UpdatedAt = DateTime.UtcNow;

            if (goal.CurrentAmount >= goal.TargetAmount)
            {
                goal.IsAchieved = true;
            }

            await _dbContext.SaveChangesAsync();

            await SafeCheckSavingsAchievementsAsync(userId, includeMilestones: true);

            return goal;
        }

        public async Task<SavingsGoal?> WithdrawAsync(Guid userId, Guid goalId, decimal amount)
        {
            var goal = await _dbContext.SavingsGoals
                .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId.ToString());

            if (goal == null)
            {
                return null;
            }

            if (goal.CurrentAmount - amount < 0)
            {
                throw new InvalidOperationException("Insufficient funds in savings goal");
            }

            goal.CurrentAmount -= amount;
            goal.UpdatedAt = DateTime.UtcNow;

            if (goal.CurrentAmount < goal.TargetAmount)
            {
                goal.IsAchieved = false;
            }

            await _dbContext.SaveChangesAsync();

            await SafeCheckSavingsAchievementsAsync(userId, includeMilestones: true);

            return goal;
        }

        public async Task<object> GetSummaryAsync(Guid userId)
        {
            var allUserIds = await GetUserAndPartnerIdsAsync(userId);

            var goals = await _dbContext.SavingsGoals
                .Where(g => allUserIds.Contains(g.UserId))
                .AsNoTracking()
                .ToListAsync();

            var totalTarget = goals.Sum(g => g.TargetAmount);
            var totalCurrent = goals.Sum(g => g.CurrentAmount);

            var summary = new
            {
                totalGoals = goals.Count,
                activeGoals = goals.Count(g => !g.IsAchieved),
                achievedGoals = goals.Count(g => g.IsAchieved),
                totalTargetAmount = totalTarget,
                totalCurrentAmount = totalCurrent,
                totalRemaining = goals.Where(g => !g.IsAchieved).Sum(g => g.TargetAmount - g.CurrentAmount),
                overallProgress = totalTarget > 0
                    ? Math.Round((totalCurrent / totalTarget) * 100, 2)
                    : 0,
                highPriorityGoals = goals.Count(g => g.Priority == "high" && !g.IsAchieved),
                mediumPriorityGoals = goals.Count(g => g.Priority == "medium" && !g.IsAchieved),
                lowPriorityGoals = goals.Count(g => g.Priority == "low" && !g.IsAchieved)
            };

            return summary;
        }

        // ===== Helpers =====

        private async Task<List<string>> GetUserAndPartnerIdsAsync(Guid userId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var ids = new List<string> { userId.ToString() };
            ids.AddRange(partnerIds);
            return ids;
        }

        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .AsNoTracking()
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

        private static DateTime NormalizeToUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
                _ => value.ToUniversalTime()
            };
        }

        private async Task SafeCheckSavingsAchievementsAsync(Guid userId, bool includeMilestones)
        {
            try
            {
                await _achievementService.CheckSavingsAchievementsAsync(userId.ToString());

                if (includeMilestones)
                {
                    await _achievementService.CheckMilestoneAchievementsAsync(userId.ToString());
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking savings achievements for user {UserId}", userId);
            }
        }
    }
}

