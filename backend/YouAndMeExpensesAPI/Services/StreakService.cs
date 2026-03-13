using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class StreakService : IStreakService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<StreakService> _logger;

        private static readonly Dictionary<int, int> StreakMilestonePoints = new()
        {
            { 3, 10 },
            { 7, 25 },
            { 14, 50 },
            { 30, 100 },
            { 60, 250 },
            { 90, 500 },
            { 180, 1000 },
            { 365, 2500 }
        };

        public StreakService(AppDbContext context, ILogger<StreakService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<UserStreak> RecordActivityAsync(string userId, string streakType)
        {
            var today = DateTime.UtcNow.Date;

            var streak = await _context.UserStreaks
                .FirstOrDefaultAsync(s => s.UserId == userId && s.StreakType == streakType);

            if (streak == null)
            {
                streak = new UserStreak
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    StreakType = streakType,
                    CurrentStreak = 1,
                    LongestStreak = 1,
                    LastActivityDate = today,
                    TotalPoints = 5,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserStreaks.Add(streak);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Created new {StreakType} streak for user {UserId}", streakType, userId);
                return streak;
            }

            if (streak.LastActivityDate.HasValue && streak.LastActivityDate.Value.Date == today)
            {
                return streak;
            }

            var yesterday = today.AddDays(-1);
            if (streak.LastActivityDate.HasValue && streak.LastActivityDate.Value.Date == yesterday)
            {
                streak.CurrentStreak++;
            }
            else
            {
                streak.CurrentStreak = 1;
            }

            if (streak.CurrentStreak > streak.LongestStreak)
            {
                streak.LongestStreak = streak.CurrentStreak;
            }

            streak.TotalPoints += 5;
            if (StreakMilestonePoints.TryGetValue(streak.CurrentStreak, out var bonus))
            {
                streak.TotalPoints += bonus;
                _logger.LogInformation(
                    "User {UserId} hit {StreakType} streak milestone: {Streak} days (+{Bonus} points)",
                    userId, streakType, streak.CurrentStreak, bonus);
            }

            streak.LastActivityDate = today;
            streak.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return streak;
        }

        public async Task<List<UserStreak>> GetStreaksAsync(string userId)
        {
            var streaks = await _context.UserStreaks
                .Where(s => s.UserId == userId)
                .OrderBy(s => s.StreakType)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            foreach (var streak in streaks)
            {
                if (streak.LastActivityDate.HasValue)
                {
                    var daysSince = (today - streak.LastActivityDate.Value.Date).Days;
                    if (daysSince > 1)
                    {
                        streak.CurrentStreak = 0;
                    }
                }
            }

            return streaks;
        }

        public async Task CheckAndResetBrokenStreaksAsync(string userId)
        {
            var today = DateTime.UtcNow.Date;
            var streaks = await _context.UserStreaks
                .Where(s => s.UserId == userId)
                .ToListAsync();

            foreach (var streak in streaks)
            {
                if (streak.LastActivityDate.HasValue)
                {
                    var daysSince = (today - streak.LastActivityDate.Value.Date).Days;
                    if (daysSince > 1 && streak.CurrentStreak > 0)
                    {
                        streak.CurrentStreak = 0;
                        streak.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
