using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class YearInReviewService : IYearInReviewService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<YearInReviewService> _logger;

        public YearInReviewService(AppDbContext context, ILogger<YearInReviewService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<object> GetYearReviewAsync(string userId, int year)
        {
            var cached = await _context.YearReviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Year == year);

            if (cached != null)
            {
                return JsonSerializer.Deserialize<object>(cached.Data) ?? new { };
            }

            return await GenerateAndCacheAsync(userId, year);
        }

        public async Task<object> RegenerateYearReviewAsync(string userId, int year)
        {
            var existing = await _context.YearReviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Year == year);

            if (existing != null)
                _context.YearReviews.Remove(existing);

            return await GenerateAndCacheAsync(userId, year);
        }

        private async Task<object> GenerateAndCacheAsync(string userId, int year)
        {
            var startDate = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endDate = new DateTime(year, 12, 31, 23, 59, 59, DateTimeKind.Utc);

            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.Date >= startDate && t.Date <= endDate)
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Type == "income").Sum(t => t.Amount);
            var totalExpenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
            var netSavings = totalIncome - totalExpenses;
            var savingsRate = totalIncome > 0 ? Math.Round((double)(netSavings / totalIncome * 100), 1) : 0;

            var topCategories = transactions
                .Where(t => t.Type == "expense" && !string.IsNullOrEmpty(t.Category))
                .GroupBy(t => t.Category)
                .Select(g => new { category = g.Key, amount = g.Sum(x => x.Amount) })
                .OrderByDescending(g => g.amount)
                .Take(5)
                .ToList();

            var biggestExpense = transactions
                .Where(t => t.Type == "expense")
                .OrderByDescending(t => t.Amount)
                .Select(t => new { amount = t.Amount, description = t.Description ?? "", date = t.Date.ToString("yyyy-MM-dd"), category = t.Category ?? "" })
                .FirstOrDefault();

            var monthlyExpenses = transactions
                .Where(t => t.Type == "expense")
                .GroupBy(t => t.Date.Month)
                .Select(g => new { month = g.Key, total = g.Sum(x => x.Amount) })
                .OrderByDescending(g => g.total)
                .ToList();

            var monthlySavings = Enumerable.Range(1, 12).Select(m =>
            {
                var monthIncome = transactions.Where(t => t.Type == "income" && t.Date.Month == m).Sum(t => t.Amount);
                var monthExpense = transactions.Where(t => t.Type == "expense" && t.Date.Month == m).Sum(t => t.Amount);
                return new { month = m, savings = monthIncome - monthExpense };
            }).ToList();

            var highestSpendingMonth = monthlyExpenses.FirstOrDefault();
            var bestSavingsMonth = monthlySavings.OrderByDescending(m => m.savings).FirstOrDefault();

            var totalTransactions = transactions.Count;

            // Streak highlights
            var streaks = await _context.UserStreaks
                .Where(s => s.UserId == userId)
                .ToListAsync();
            var longestStreak = streaks.Any() ? streaks.Max(s => s.LongestStreak) : 0;

            // Achievements
            var achievementsUnlocked = await _context.UserAchievements
                .CountAsync(a => a.UserId == userId && a.UnlockedAt >= startDate && a.UnlockedAt <= endDate);

            // Health scores
            var healthScores = await _context.FinancialHealthScores
                .Where(h => h.UserId == userId && h.CalculatedAt >= startDate && h.CalculatedAt <= endDate)
                .OrderBy(h => h.CalculatedAt)
                .Select(h => new { month = h.CalculatedAt.Month, score = h.OverallScore })
                .ToListAsync();

            var monthlyScores = Enumerable.Range(1, 12).Select(m =>
                healthScores.Where(h => h.month == m).OrderByDescending(h => h.score).Select(h => h.score).FirstOrDefault()
            ).ToList();

            // Challenge stats
            var challengeStats = await _context.UserChallenges
                .Where(c => c.UserId == userId && c.StartedAt >= startDate && c.StartedAt <= endDate)
                .GroupBy(c => 1)
                .Select(g => new
                {
                    completed = g.Count(c => c.Status == "completed"),
                    totalPoints = g.Where(c => c.Status == "completed").Sum(c => c.Challenge != null ? c.Challenge.RewardPoints : 0)
                })
                .FirstOrDefaultAsync();

            // Home level
            var homeStart = await _context.PaireHomes
                .Where(h => h.UserId == userId)
                .Select(h => h.Level)
                .FirstOrDefaultAsync();

            // Partner comparison
            object? partnerComparison = null;
            var partnership = await _context.Partnerships
                .FirstOrDefaultAsync(p =>
                    (p.User1Id.ToString() == userId || p.User2Id.ToString() == userId) && p.Status == "active");

            if (partnership != null)
            {
                var partnerId = partnership.User1Id.ToString() == userId ? partnership.User2Id.ToString() : partnership.User1Id.ToString();
                var partnerTransactions = await _context.Transactions
                    .Where(t => t.UserId == partnerId && t.Date >= startDate && t.Date <= endDate)
                    .ToListAsync();

                var partnerSpent = partnerTransactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
                var partnerSaved = partnerTransactions.Where(t => t.Type == "income").Sum(t => t.Amount) - partnerSpent;

                partnerComparison = new
                {
                    youSpent = totalExpenses,
                    partnerSpent = partnerSpent,
                    youSaved = netSavings,
                    partnerSaved = partnerSaved
                };
            }

            var reviewData = new
            {
                year,
                totalIncome,
                totalExpenses,
                netSavings,
                savingsRate,
                topCategories,
                biggestExpense,
                highestSpendingMonth = highestSpendingMonth != null ? new { highestSpendingMonth.month, highestSpendingMonth.total } : null,
                bestSavingsMonth = bestSavingsMonth != null ? new { bestSavingsMonth.month, bestSavingsMonth.savings } : null,
                totalTransactions,
                longestStreak,
                achievementsUnlocked,
                monthlyScores,
                monthlySavings = monthlySavings.Select(m => new { m.month, m.savings }),
                challengeStats = new
                {
                    completed = challengeStats?.completed ?? 0,
                    totalPoints = challengeStats?.totalPoints ?? 0
                },
                homeLevel = homeStart,
                partnerComparison
            };

            var json = JsonSerializer.Serialize(reviewData);
            _context.YearReviews.Add(new YearReview
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Year = year,
                Data = json,
                GeneratedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("Generated year review for user {UserId}, year {Year}", userId, year);
            return reviewData;
        }
    }
}
