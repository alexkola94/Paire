using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Entities;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Infrastructure;
using Paire.Modules.Finance.Infrastructure;

namespace Paire.Modules.Analytics.Core.Services;

public class WeeklyRecapService : IWeeklyRecapService
{
    private readonly AnalyticsDbContext _analyticsContext;
    private readonly FinanceDbContext _financeContext;
    private readonly ILogger<WeeklyRecapService> _logger;

    public WeeklyRecapService(AnalyticsDbContext analyticsContext, FinanceDbContext financeContext, ILogger<WeeklyRecapService> logger)
    {
        _analyticsContext = analyticsContext;
        _financeContext = financeContext;
        _logger = logger;
    }

    public async Task<WeeklyRecap> GenerateRecapAsync(string userId, DateTime? weekStart = null)
    {
        var (start, end) = GetWeekBoundaries(weekStart);
        var transactions = await _financeContext.Transactions.Where(t => t.UserId == userId && t.Date >= start && t.Date <= end).ToListAsync();

        var totalSpent = transactions.Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        var totalIncome = transactions.Where(t => string.Equals(t.Type, "income", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount);
        var topCategoriesData = transactions.Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(t.Category)).GroupBy(t => t.Category).Select(g => (Category: g.Key, Amount: g.Sum(t => t.Amount))).OrderByDescending(x => x.Amount).Take(3).ToList();
        var topCategoriesJson = JsonSerializer.Serialize(topCategoriesData.Select(x => new { category = x.Category, amount = x.Amount }));

        var personality = "supportive";
        var insights = GenerateInsights(totalSpent, totalIncome, topCategoriesData, personality);
        var formattedContent = BuildFormattedContent(totalSpent, totalIncome, topCategoriesData, insights);

        var recap = new WeeklyRecap { Id = Guid.NewGuid(), UserId = userId, WeekStart = start, WeekEnd = end, TotalSpent = totalSpent, TotalIncome = totalIncome, TopCategories = topCategoriesJson, Insights = insights, PersonalityMode = personality, FormattedContent = formattedContent, EmailSent = false, NotificationSent = false, CreatedAt = DateTime.UtcNow };
        _analyticsContext.WeeklyRecaps.Add(recap);
        await _analyticsContext.SaveChangesAsync();
        _logger.LogInformation("Generated weekly recap for user {UserId}, week {WeekStart:yyyy-MM-dd}", userId, start);
        return recap;
    }

    public async Task<WeeklyRecap?> GetLatestRecapAsync(string userId) => await _analyticsContext.WeeklyRecaps.Where(r => r.UserId == userId).OrderByDescending(r => r.WeekEnd).FirstOrDefaultAsync();

    public async Task<List<WeeklyRecap>> GetRecapHistoryAsync(string userId, int count = 4) => await _analyticsContext.WeeklyRecaps.Where(r => r.UserId == userId).OrderByDescending(r => r.WeekEnd).Take(count).ToListAsync();

    private static (DateTime Start, DateTime End) GetWeekBoundaries(DateTime? weekStart)
    {
        var reference = weekStart ?? DateTime.UtcNow.Date;
        var daysFromMonday = ((int)reference.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        var start = reference.AddDays(-daysFromMonday).Date;
        var end = start.AddDays(6).Date.AddHours(23).AddMinutes(59).AddSeconds(59);
        return (start, end);
    }

    private static string GenerateInsights(decimal totalSpent, decimal totalIncome, List<(string Category, decimal Amount)> topCategories, string personality)
    {
        var insights = new List<string>();
        if (totalIncome > 0) { var savingsRate = (totalIncome - totalSpent) / totalIncome * 100; insights.Add(savingsRate >= 20 ? "You saved a healthy portion of your income this week." : savingsRate >= 0 ? "You stayed within your income." : "Spending exceeded income this week."); }
        if (topCategories.Count > 0) insights.Add($"Your biggest spend was on {topCategories[0].Category} ({topCategories[0].Amount:C}).");
        return string.Join(" ", insights);
    }

    private static string BuildFormattedContent(decimal totalSpent, decimal totalIncome, List<(string Category, decimal Amount)> topCategories, string insights)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("## Spending Summary").AppendLine($"- **Total Spent:** {totalSpent:C}").AppendLine($"- **Total Income:** {totalIncome:C}").AppendLine($"- **Net:** {(totalIncome - totalSpent):C}").AppendLine();
        sb.AppendLine("## Top Categories");
        foreach (var cat in topCategories) sb.AppendLine($"- **{cat.Category}:** {cat.Amount:C}");
        sb.AppendLine().AppendLine("## Insights").AppendLine().AppendLine(insights);
        return sb.ToString();
    }
}
