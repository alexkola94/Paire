using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class ChallengeService : IChallengeService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ChallengeService> _logger;

        public ChallengeService(AppDbContext context, ILogger<ChallengeService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<Challenge>> GetAvailableChallengesAsync()
        {
            return await _context.Challenges
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Difficulty)
                .ToListAsync();
        }

        public async Task<List<UserChallenge>> GetUserChallengesAsync(string userId, string? status = null)
        {
            var query = _context.UserChallenges
                .Include(uc => uc.Challenge)
                .Where(uc => uc.UserId == userId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(uc => uc.Status == status);

            return await query
                .OrderByDescending(uc => uc.CreatedAt)
                .ToListAsync();
        }

        public async Task<UserChallenge> JoinChallengeAsync(string userId, Guid challengeId)
        {
            var challenge = await _context.Challenges.FindAsync(challengeId)
                ?? throw new InvalidOperationException("Challenge not found");

            var existing = await _context.UserChallenges
                .FirstOrDefaultAsync(uc =>
                    uc.UserId == userId &&
                    uc.ChallengeId == challengeId &&
                    uc.Status == "active");

            if (existing != null)
                return existing;

            var now = DateTime.UtcNow;
            var expiresAt = challenge.ChallengeType switch
            {
                "weekly" => now.AddDays(7),
                "monthly" => now.AddDays(30),
                "daily" => now.AddDays(1),
                _ => now.AddDays(7)
            };

            decimal targetValue = 0;
            if (decimal.TryParse(challenge.CriteriaValue, out var parsed))
                targetValue = parsed;

            var userChallenge = new UserChallenge
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ChallengeId = challengeId,
                Status = "active",
                Progress = 0,
                TargetValue = targetValue,
                CurrentValue = 0,
                StartedAt = now,
                ExpiresAt = expiresAt,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.UserChallenges.Add(userChallenge);
            await _context.SaveChangesAsync();

            userChallenge.Challenge = challenge;
            _logger.LogInformation("User {UserId} joined challenge {ChallengeId}", userId, challengeId);
            return userChallenge;
        }

        public async Task<UserChallenge?> UpdateProgressAsync(string userId, Guid userChallengeId, decimal incrementBy)
        {
            var uc = await _context.UserChallenges
                .Include(x => x.Challenge)
                .FirstOrDefaultAsync(x => x.Id == userChallengeId && x.UserId == userId && x.Status == "active");

            if (uc == null) return null;

            uc.CurrentValue += incrementBy;
            uc.Progress = uc.TargetValue > 0 ? Math.Min(100, (uc.CurrentValue / uc.TargetValue) * 100) : 0;
            uc.UpdatedAt = DateTime.UtcNow;

            if (uc.CurrentValue >= uc.TargetValue)
            {
                uc.Status = "completed";
                uc.CompletedAt = DateTime.UtcNow;
                uc.Progress = 100;
                _logger.LogInformation("User {UserId} completed challenge {ChallengeId}", userId, uc.ChallengeId);
            }

            await _context.SaveChangesAsync();
            return uc;
        }

        public async Task<UserChallenge?> ClaimRewardAsync(string userId, Guid userChallengeId)
        {
            var uc = await _context.UserChallenges
                .Include(x => x.Challenge)
                .FirstOrDefaultAsync(x => x.Id == userChallengeId && x.UserId == userId && x.Status == "completed");

            if (uc == null || uc.RewardClaimed) return null;

            uc.RewardClaimed = true;
            uc.UpdatedAt = DateTime.UtcNow;

            if (uc.Challenge != null)
            {
                var streak = await _context.UserStreaks
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.StreakType == "expense_logging");

                if (streak != null)
                {
                    streak.TotalPoints += uc.Challenge.RewardPoints;
                    streak.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("User {UserId} claimed reward for challenge {ChallengeId}", userId, uc.ChallengeId);
            return uc;
        }

        public async Task ProcessTransactionForChallengesAsync(string userId, decimal amount, string? category = null)
        {
            var activeChallenges = await _context.UserChallenges
                .Include(uc => uc.Challenge)
                .Where(uc => uc.UserId == userId && uc.Status == "active" && uc.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var uc in activeChallenges)
            {
                if (uc.Challenge == null) continue;

                var shouldUpdate = uc.Challenge.CriteriaType switch
                {
                    "transaction_count" => true,
                    "amount" when uc.Challenge.Category == "spending" => amount < 0 || uc.Challenge.Category == "spending",
                    "amount" when uc.Challenge.Category == "saving" => amount > 0,
                    "category_count" when !string.IsNullOrEmpty(category) =>
                        uc.Challenge.CriteriaValue?.Contains(category, StringComparison.OrdinalIgnoreCase) ?? false,
                    "no_spend" => true,
                    _ => false
                };

                if (!shouldUpdate) continue;

                var increment = uc.Challenge.CriteriaType switch
                {
                    "transaction_count" => 1m,
                    "category_count" => 1m,
                    "amount" => Math.Abs(amount),
                    "no_spend" => 1m,
                    _ => 0m
                };

                if (increment > 0)
                {
                    uc.CurrentValue += increment;
                    uc.Progress = uc.TargetValue > 0 ? Math.Min(100, (uc.CurrentValue / uc.TargetValue) * 100) : 0;
                    uc.UpdatedAt = DateTime.UtcNow;

                    if (uc.CurrentValue >= uc.TargetValue)
                    {
                        uc.Status = "completed";
                        uc.CompletedAt = DateTime.UtcNow;
                        uc.Progress = 100;
                        _logger.LogInformation("User {UserId} auto-completed challenge {ChallengeId} via transaction", userId, uc.ChallengeId);
                    }
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task SeedDefaultChallengesAsync()
        {
            if (await _context.Challenges.AnyAsync()) return;

            var defaults = new List<Challenge>
            {
                new()
                {
                    Id = Guid.NewGuid(), Code = "weekly_log_5", Name = "Steady Logger",
                    Description = "Log at least 5 expenses this week",
                    ChallengeType = "weekly", Category = "tracking", Icon = "clipboard-check",
                    CriteriaType = "transaction_count", CriteriaValue = "5",
                    RewardPoints = 50, Difficulty = "easy", SortOrder = 1
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "weekly_budget_hero", Name = "Budget Hero",
                    Description = "Stay under your weekly budget",
                    ChallengeType = "weekly", Category = "spending", Icon = "shield-check",
                    CriteriaType = "amount", CriteriaValue = "0",
                    RewardPoints = 75, Difficulty = "medium", SortOrder = 2
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "weekly_no_impulse", Name = "No Impulse Week",
                    Description = "Go 7 days with no unplanned purchases",
                    ChallengeType = "weekly", Category = "spending", Icon = "ban",
                    CriteriaType = "no_spend", CriteriaValue = "7",
                    RewardPoints = 100, Difficulty = "hard", SortOrder = 3
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "monthly_save_10", Name = "Saving Star",
                    Description = "Save 10% more than last month",
                    ChallengeType = "monthly", Category = "saving", Icon = "trending-up",
                    CriteriaType = "amount", CriteriaValue = "10",
                    RewardPoints = 150, Difficulty = "medium", SortOrder = 4
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "weekly_log_streak_7", Name = "Week Warrior",
                    Description = "Log expenses every day for a full week",
                    ChallengeType = "weekly", Category = "tracking", Icon = "zap",
                    CriteriaType = "transaction_count", CriteriaValue = "7",
                    RewardPoints = 100, Difficulty = "medium", SortOrder = 5
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "monthly_category_check", Name = "Category Master",
                    Description = "Categorize all expenses for the entire month",
                    ChallengeType = "monthly", Category = "tracking", Icon = "tag",
                    CriteriaType = "transaction_count", CriteriaValue = "30",
                    RewardPoints = 200, Difficulty = "hard", SortOrder = 6
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "daily_log_1", Name = "Daily Check-in",
                    Description = "Log at least one expense today",
                    ChallengeType = "daily", Category = "tracking", Icon = "check-circle",
                    CriteriaType = "transaction_count", CriteriaValue = "1",
                    RewardPoints = 10, Difficulty = "easy", SortOrder = 7
                },
                new()
                {
                    Id = Guid.NewGuid(), Code = "weekly_couple_sync", Name = "Couple Sync",
                    Description = "Both partners log at least 3 expenses each this week",
                    ChallengeType = "weekly", Category = "couple", Icon = "heart",
                    CriteriaType = "transaction_count", CriteriaValue = "6",
                    RewardPoints = 120, Difficulty = "medium", SortOrder = 8
                },
            };

            _context.Challenges.AddRange(defaults);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Seeded {Count} default challenges", defaults.Count);
        }

        public async Task ExpireOverdueChallengesAsync()
        {
            var now = DateTime.UtcNow;
            var overdue = await _context.UserChallenges
                .Where(uc => uc.Status == "active" && uc.ExpiresAt <= now)
                .ToListAsync();

            foreach (var uc in overdue)
            {
                uc.Status = "expired";
                uc.UpdatedAt = now;
            }

            if (overdue.Count > 0)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Expired {Count} overdue challenges", overdue.Count);
            }
        }
    }
}
