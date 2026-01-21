using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Application service that encapsulates all BudgetsController business logic and EF usage.
    /// </summary>
    public class BudgetsAppService : IBudgetsAppService
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<BudgetsAppService> _logger;

        public BudgetsAppService(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<BudgetsAppService> logger)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
        }

        /// <summary>
        /// Returns budgets enriched with user profile data, preserving the current anonymous shape.
        /// </summary>
        public async Task<IEnumerable<object>> GetBudgetsWithProfilesAsync(Guid userId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

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
                p => new
                {
                    id = p.Id,
                    email = p.Email,
                    display_name = p.DisplayName,
                    avatar_url = p.AvatarUrl
                });

            var enrichedBudgets = budgets.Select(b => new
            {
                id = b.Id,
                user_id = b.UserId,
                category = b.Category,
                amount = b.Amount,
                period = b.Period,
                spent_amount = b.SpentAmount,
                is_active = b.IsActive,
                start_date = b.StartDate,
                end_date = b.EndDate,
                created_at = b.CreatedAt,
                updated_at = b.UpdatedAt,
                user_profiles = profileDict.ContainsKey(b.UserId) ? profileDict[b.UserId] : null
            });

            return enrichedBudgets;
        }

        public async Task<Budget?> GetBudgetAsync(Guid userId, Guid id)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            return await _dbContext.Budgets
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));
        }

        public async Task<Budget> CreateBudgetAsync(Guid userId, Budget budget)
        {
            budget.Id = Guid.NewGuid();
            budget.UserId = userId.ToString();
            budget.CreatedAt = DateTime.UtcNow;
            budget.UpdatedAt = DateTime.UtcNow;

            // Ensure StartDate is UTC
            if (budget.StartDate.Kind == DateTimeKind.Unspecified)
            {
                budget.StartDate = DateTime.SpecifyKind(budget.StartDate, DateTimeKind.Utc);
            }
            else if (budget.StartDate.Kind == DateTimeKind.Local)
            {
                budget.StartDate = budget.StartDate.ToUniversalTime();
            }

            // Ensure EndDate is UTC if provided
            if (budget.EndDate.HasValue)
            {
                if (budget.EndDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    budget.EndDate = DateTime.SpecifyKind(budget.EndDate.Value, DateTimeKind.Utc);
                }
                else if (budget.EndDate.Value.Kind == DateTimeKind.Local)
                {
                    budget.EndDate = budget.EndDate.Value.ToUniversalTime();
                }
            }

            _dbContext.Budgets.Add(budget);
            await _dbContext.SaveChangesAsync();

            try
            {
                await _achievementService.CheckBudgetAchievementsAsync(userId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking achievements after budget creation");
            }

            return budget;
        }

        public async Task<Budget?> UpdateBudgetAsync(Guid userId, Guid id, Budget updates)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var existingBudget = await _dbContext.Budgets
                .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

            if (existingBudget == null)
            {
                return null;
            }

            existingBudget.Category = updates.Category;
            existingBudget.Amount = updates.Amount;
            existingBudget.Period = updates.Period;
            existingBudget.SpentAmount = updates.SpentAmount;
            existingBudget.IsActive = updates.IsActive;
            existingBudget.UpdatedAt = DateTime.UtcNow;

            if (updates.StartDate.Kind == DateTimeKind.Unspecified)
            {
                existingBudget.StartDate = DateTime.SpecifyKind(updates.StartDate, DateTimeKind.Utc);
            }
            else if (updates.StartDate.Kind == DateTimeKind.Local)
            {
                existingBudget.StartDate = updates.StartDate.ToUniversalTime();
            }
            else
            {
                existingBudget.StartDate = updates.StartDate;
            }

            if (updates.EndDate.HasValue)
            {
                if (updates.EndDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    existingBudget.EndDate = DateTime.SpecifyKind(updates.EndDate.Value, DateTimeKind.Utc);
                }
                else if (updates.EndDate.Value.Kind == DateTimeKind.Local)
                {
                    existingBudget.EndDate = updates.EndDate.Value.ToUniversalTime();
                }
                else
                {
                    existingBudget.EndDate = updates.EndDate;
                }
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
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var budget = await _dbContext.Budgets
                .FirstOrDefaultAsync(b => b.Id == id && allUserIds.Contains(b.UserId));

            if (budget == null)
            {
                return false;
            }

            _dbContext.Budgets.Remove(budget);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Shared helper to get partner IDs for a user.
        /// </summary>
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
    }
}

