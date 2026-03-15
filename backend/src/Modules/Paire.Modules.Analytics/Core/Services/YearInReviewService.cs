using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Infrastructure;
using Paire.Modules.Finance.Infrastructure;
using Paire.Modules.Partnership.Contracts;

namespace Paire.Modules.Analytics.Core.Services;

public class YearInReviewService : IYearInReviewService
{
    private readonly AnalyticsDbContext _analyticsDb;
    private readonly FinanceDbContext _financeDb;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly IAchievementService _achievementService;
    private readonly ILogger<YearInReviewService> _logger;

    public YearInReviewService(
        AnalyticsDbContext analyticsDb,
        FinanceDbContext financeDb,
        IPartnershipResolver partnershipResolver,
        IAchievementService achievementService,
        ILogger<YearInReviewService> logger)
    {
        _analyticsDb = analyticsDb;
        _financeDb = financeDb;
        _partnershipResolver = partnershipResolver;
        _achievementService = achievementService;
        _logger = logger;
    }

    public async Task<object?> GetYearReviewAsync(string userId, int year)
    {
        var yearStart = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearEnd = yearStart.AddYears(1).AddTicks(-1);

        // Try cached year_reviews first
        var cached = await _analyticsDb.YearReviews
            .AsNoTracking()
            .FirstOrDefaultAsync(yr => yr.UserId == userId && yr.Year == year);
        if (cached != null && !string.IsNullOrEmpty(cached.Data))
        {
            try
            {
                return JsonSerializer.Deserialize<JsonElement>(cached.Data);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse cached year review for user {UserId} year {Year}", userId, year);
            }
        }

        // Generate on-the-fly
        var householdIds = await GetHouseholdUserIdsAsync(userId);
        var transactions = await _financeDb.Transactions
            .AsNoTracking()
            .Where(t => householdIds.Contains(t.UserId) && t.Date >= yearStart && t.Date <= yearEnd)
            .ToListAsync();

        var totalIncome = transactions.Where(t => t.Type.Equals("income", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        var totalExpenses = transactions.Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        var netSavings = totalIncome - totalExpenses;
        var savingsRate = totalIncome > 0 ? (double)((netSavings / totalIncome) * 100) : 0;

        var topCategories = transactions
            .Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(t.Category))
            .GroupBy(t => t.Category!)
            .Select(g => new { category = g.Key, amount = (double)g.Sum(t => t.Amount) })
            .OrderByDescending(x => x.amount)
            .Take(10)
            .ToList();

        var biggestExpense = transactions
            .Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(t => t.Amount)
            .Select(t => new
            {
                amount = (double)t.Amount,
                description = t.Description ?? "",
                category = t.Category ?? "",
                date = t.Date
            })
            .FirstOrDefault();

        // Best savings month & highest spending month
        var byMonth = transactions
            .GroupBy(t => new { t.Date.Year, t.Date.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Income = g.Where(t => t.Type.Equals("income", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount),
                Expenses = g.Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount)
            })
            .Select(m => new
            {
                m.Year,
                m.Month,
                m.Income,
                m.Expenses,
                Savings = m.Income - m.Expenses
            })
            .ToList();

        var bestSavingsMonth = byMonth
            .Where(m => m.Savings > 0)
            .OrderByDescending(m => m.Savings)
            .Select(m => new { month = m.Month, savings = (double)m.Savings })
            .FirstOrDefault();

        var highestSpendingMonth = byMonth
            .OrderByDescending(m => m.Expenses)
            .Select(m => new { month = m.Month, total = (double)m.Expenses })
            .FirstOrDefault();

        // Achievements
        var achievementStats = await _achievementService.GetAchievementStatsAsync(userId);

        // Monthly Paire scores (from financial_health_scores)
        var monthlyScores = await _analyticsDb.FinancialHealthScores
            .AsNoTracking()
            .Where(f => f.UserId == userId && f.Period.StartsWith(year.ToString()))
            .OrderBy(f => f.Period)
            .Select(f => f.OverallScore)
            .ToListAsync();
        while (monthlyScores.Count < 12)
            monthlyScores.Add(0);

        // Partner comparison
        object? partnerComparison = null;
        var partnerId = await _partnershipResolver.GetPartnerUserIdAsync(userId);
        if (!string.IsNullOrEmpty(partnerId))
        {
            var myExpenses = transactions
                .Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase) && t.UserId == userId)
                .Sum(t => t.Amount);
            var partnerExpenses = transactions
                .Where(t => t.Type.Equals("expense", StringComparison.OrdinalIgnoreCase) && t.UserId == partnerId)
                .Sum(t => t.Amount);
            var myIncome = transactions
                .Where(t => t.Type.Equals("income", StringComparison.OrdinalIgnoreCase) && t.UserId == userId)
                .Sum(t => t.Amount);
            var partnerIncome = transactions
                .Where(t => t.Type.Equals("income", StringComparison.OrdinalIgnoreCase) && t.UserId == partnerId)
                .Sum(t => t.Amount);
            var mySaved = myIncome - myExpenses;
            var partnerSaved = partnerIncome - partnerExpenses;

            partnerComparison = new
            {
                youSpent = (double)myExpenses,
                partnerSpent = (double)partnerExpenses,
                youSaved = (double)mySaved,
                partnerSaved = (double)partnerSaved
            };
        }

        var result = new
        {
            totalIncome = (double)totalIncome,
            totalExpenses = (double)totalExpenses,
            netSavings = (double)netSavings,
            savingsRate,
            topCategories,
            biggestExpense,
            bestSavingsMonth,
            highestSpendingMonth,
            longestStreak = 0,
            achievementsUnlocked = achievementStats.Unlocked,
            challengeStats = new { completed = 0, totalPoints = 0 },
            monthlyScores,
            partnerComparison,
            transactionCount = transactions.Count
        };

        return result;
    }

    private async Task<List<string>> GetHouseholdUserIdsAsync(string userId)
    {
        try
        {
            return await _partnershipResolver.GetHouseholdUserIdsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting household IDs for user {UserId}", userId);
            return new List<string> { userId };
        }
    }
}
