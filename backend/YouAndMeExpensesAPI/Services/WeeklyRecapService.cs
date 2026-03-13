using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class WeeklyRecapService : IWeeklyRecapService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<WeeklyRecapService> _logger;

        public WeeklyRecapService(AppDbContext context, ILogger<WeeklyRecapService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<WeeklyRecap> GenerateRecapAsync(string userId, DateTime? weekStart = null)
        {
            var (start, end) = GetWeekBoundaries(weekStart);

            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.Date >= start && t.Date <= end)
                .ToListAsync();

            var totalSpent = transactions
                .Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            var totalIncome = transactions
                .Where(t => string.Equals(t.Type, "income", StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            var topCategoriesData = transactions
                .Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(t.Category))
                .GroupBy(t => t.Category)
                .Select(g => new CategorySummary(g.Key, g.Sum(t => t.Amount)))
                .OrderByDescending(x => x.Amount)
                .Take(3)
                .ToList();

            var topCategoriesJson = JsonSerializer.Serialize(topCategoriesData.Select(x => new { category = x.Category, amount = x.Amount }));

            var personality = "supportive";
            if (Guid.TryParse(userId, out var userGuid))
            {
                var prefs = await _context.ReminderPreferences
                    .Where(p => p.UserId == userGuid)
                    .Select(p => p.ChatbotPersonality)
                    .FirstOrDefaultAsync();
                if (!string.IsNullOrWhiteSpace(prefs))
                    personality = prefs;
            }

            var insights = GenerateInsights(totalSpent, totalIncome, topCategoriesData, personality);
            var formattedContent = BuildFormattedContent(totalSpent, totalIncome, topCategoriesData, insights);

            var recap = new WeeklyRecap
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                WeekStart = start,
                WeekEnd = end,
                TotalSpent = totalSpent,
                TotalIncome = totalIncome,
                TopCategories = topCategoriesJson,
                Insights = insights,
                PersonalityMode = personality,
                FormattedContent = formattedContent,
                EmailSent = false,
                NotificationSent = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.WeeklyRecaps.Add(recap);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Generated weekly recap for user {UserId}, week {WeekStart:yyyy-MM-dd}", userId, start);
            return recap;
        }

        public async Task<WeeklyRecap?> GetLatestRecapAsync(string userId)
        {
            return await _context.WeeklyRecaps
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.WeekEnd)
                .FirstOrDefaultAsync();
        }

        public async Task<List<WeeklyRecap>> GetRecapHistoryAsync(string userId, int count = 4)
        {
            return await _context.WeeklyRecaps
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.WeekEnd)
                .Take(count)
                .ToListAsync();
        }

        private static (DateTime Start, DateTime End) GetWeekBoundaries(DateTime? weekStart)
        {
            var reference = weekStart ?? DateTime.UtcNow.Date;
            var daysFromMonday = ((int)reference.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            var start = reference.AddDays(-daysFromMonday).Date;
            var end = start.AddDays(6).Date.AddHours(23).AddMinutes(59).AddSeconds(59);
            return (start, end);
        }

        private static string GenerateInsights(decimal totalSpent, decimal totalIncome, List<CategorySummary> topCategories, string personality)
        {
            var insights = new List<string>();

            if (totalIncome > 0)
            {
                var savingsRate = (totalIncome - totalSpent) / totalIncome * 100;
                if (personality.Equals("supportive", StringComparison.OrdinalIgnoreCase))
                {
                    if (savingsRate >= 20)
                        insights.Add("You saved a healthy portion of your income this week. Keep it up!");
                    else if (savingsRate >= 0)
                        insights.Add("You stayed within your income. Small steps lead to big wins.");
                    else
                        insights.Add("Spending exceeded income this week. Consider reviewing your top categories.");
                }
                else if (personality.Equals("direct", StringComparison.OrdinalIgnoreCase))
                {
                    if (savingsRate >= 20)
                        insights.Add("Strong savings rate. Maintain this discipline.");
                    else if (savingsRate >= 0)
                        insights.Add("Break-even week. Look for areas to trim.");
                    else
                        insights.Add("Overspent. Focus on reducing top categories.");
                }
                else
                {
                    if (savingsRate >= 20)
                        insights.Add("Great savings this week.");
                    else if (savingsRate >= 0)
                        insights.Add("Income covered expenses.");
                    else
                        insights.Add("Spending exceeded income.");
                }
            }

            if (topCategories.Count > 0)
            {
                var top = topCategories[0];
                insights.Add($"Your biggest spend was on {top.Category} ({top.Amount:C}).");
            }

            return string.Join(" ", insights);
        }

        private static string BuildFormattedContent(decimal totalSpent, decimal totalIncome, List<CategorySummary> topCategories, string insights)
        {
            var sb = new System.Text.StringBuilder();

            sb.AppendLine("## Spending Summary");
            sb.AppendLine();
            sb.AppendLine($"- **Total Spent:** {totalSpent:C}");
            sb.AppendLine($"- **Total Income:** {totalIncome:C}");
            sb.AppendLine($"- **Net:** {(totalIncome - totalSpent):C}");
            sb.AppendLine();

            sb.AppendLine("## Top Categories");
            sb.AppendLine();
            if (topCategories.Count == 0)
            {
                sb.AppendLine("No expense categories this week.");
            }
            else
            {
                foreach (var cat in topCategories)
                {
                    sb.AppendLine($"- **{cat.Category}:** {cat.Amount:C}");
                }
            }
            sb.AppendLine();

            sb.AppendLine("## Insights");
            sb.AppendLine();
            sb.AppendLine(insights);

            return sb.ToString();
        }

        private sealed record CategorySummary(string Category, decimal Amount);
    }
}
