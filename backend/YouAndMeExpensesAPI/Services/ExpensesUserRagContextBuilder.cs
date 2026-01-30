using System.Text;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Expenses-APP implementation of IUserRagContextBuilder.
/// Builds a financial summary for the user including:
/// - Current month income/expenses/balance
/// - Top spending categories
/// - Recurring bills summary
/// - Savings goals progress
/// - Active loans
/// 
/// This content is synced to RAG so "Thinking mode" can answer questions
/// about the user's financial data.
/// </summary>
public class ExpensesUserRagContextBuilder : IUserRagContextBuilder
{
    private readonly IAnalyticsService _analyticsService;
    private readonly IRecurringBillsService _recurringBillsService;
    private readonly ISavingsGoalsService _savingsGoalsService;
    private readonly ILogger<ExpensesUserRagContextBuilder> _logger;

    public ExpensesUserRagContextBuilder(
        IAnalyticsService analyticsService,
        IRecurringBillsService recurringBillsService,
        ISavingsGoalsService savingsGoalsService,
        ILogger<ExpensesUserRagContextBuilder> logger)
    {
        _analyticsService = analyticsService;
        _recurringBillsService = recurringBillsService;
        _savingsGoalsService = savingsGoalsService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<(string Content, string DocumentTitle)> BuildContextAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Building RAG context for user {UserId}", userId);

        var sb = new StringBuilder();
        sb.AppendLine("# Financial Summary");
        sb.AppendLine();
        sb.AppendLine($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine();

        try
        {
            // 1. Dashboard analytics (current month overview)
            var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
            AppendDashboardSummary(sb, dashboard);

            // 2. Recurring bills summary
            if (Guid.TryParse(userId, out var userGuid))
            {
                await AppendRecurringBillsSummary(sb, userGuid);
                await AppendSavingsGoalsSummary(sb, userGuid);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building some sections of RAG context for user {UserId}", userId);
            sb.AppendLine();
            sb.AppendLine("*Note: Some financial data could not be retrieved.*");
        }

        var content = sb.ToString();
        _logger.LogInformation("Built RAG context for user {UserId}: {Length} characters", userId, content.Length);

        return (content, "Financial Summary");
    }

    /// <summary>
    /// Appends the dashboard analytics summary to the StringBuilder.
    /// </summary>
    private void AppendDashboardSummary(StringBuilder sb, DashboardAnalyticsDTO dashboard)
    {
        sb.AppendLine("## Current Month Overview");
        sb.AppendLine();
        sb.AppendLine($"- **Income:** {dashboard.CurrentMonthIncome:N2}");
        sb.AppendLine($"- **Expenses:** {dashboard.CurrentMonthExpenses:N2}");
        sb.AppendLine($"- **Balance:** {dashboard.CurrentMonthBalance:N2}");
        sb.AppendLine();

        if (dashboard.LastMonthExpenses > 0)
        {
            var changeDirection = dashboard.ChangePercentage >= 0 ? "increased" : "decreased";
            sb.AppendLine($"Compared to last month, expenses have {changeDirection} by {Math.Abs(dashboard.ChangePercentage):N1}%.");
            sb.AppendLine();
        }

        // Top spending categories
        if (dashboard.TopCategories?.Any() == true)
        {
            sb.AppendLine("## Top Spending Categories");
            sb.AppendLine();
            foreach (var cat in dashboard.TopCategories.Take(5))
            {
                sb.AppendLine($"- **{cat.Category}:** {cat.Amount:N2} ({cat.Percentage:N1}% of expenses, {cat.TransactionCount} transactions)");
            }
            sb.AppendLine();
        }

        // Active loans
        if (dashboard.ActiveLoansCount > 0)
        {
            sb.AppendLine("## Loans");
            sb.AppendLine();
            sb.AppendLine($"- Active loans: {dashboard.ActiveLoansCount}");
            sb.AppendLine($"- Total outstanding: {dashboard.TotalOutstandingLoans:N2}");
            sb.AppendLine();
        }
    }

    /// <summary>
    /// Appends the recurring bills summary to the StringBuilder.
    /// </summary>
    private async Task AppendRecurringBillsSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            var summary = await _recurringBillsService.GetSummaryAsync(userId);
            if (summary == null) return;

            // The summary is returned as an anonymous object; we need to extract properties
            var summaryDict = ConvertToDict(summary);
            if (summaryDict == null) return;

            sb.AppendLine("## Recurring Bills");
            sb.AppendLine();

            if (summaryDict.TryGetValue("totalBills", out var totalBills))
                sb.AppendLine($"- Total bills: {totalBills}");
            if (summaryDict.TryGetValue("totalMonthlyAmount", out var totalMonthly))
                sb.AppendLine($"- Total monthly amount: {totalMonthly:N2}");
            if (summaryDict.TryGetValue("paidThisMonth", out var paidCount))
                sb.AppendLine($"- Paid this month: {paidCount}");
            if (summaryDict.TryGetValue("upcomingCount", out var upcomingCount))
                sb.AppendLine($"- Upcoming (next 7 days): {upcomingCount}");
            if (summaryDict.TryGetValue("overdueCount", out var overdueCount) && Convert.ToInt32(overdueCount) > 0)
                sb.AppendLine($"- **Overdue:** {overdueCount}");

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not retrieve recurring bills summary for user {UserId}", userId);
        }
    }

    /// <summary>
    /// Appends the savings goals summary to the StringBuilder.
    /// </summary>
    private async Task AppendSavingsGoalsSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            var summary = await _savingsGoalsService.GetSummaryAsync(userId);
            if (summary == null) return;

            var summaryDict = ConvertToDict(summary);
            if (summaryDict == null) return;

            sb.AppendLine("## Savings Goals");
            sb.AppendLine();

            if (summaryDict.TryGetValue("totalGoals", out var totalGoals))
                sb.AppendLine($"- Total goals: {totalGoals}");
            if (summaryDict.TryGetValue("totalTargetAmount", out var targetAmount))
                sb.AppendLine($"- Total target: {targetAmount:N2}");
            if (summaryDict.TryGetValue("totalCurrentAmount", out var currentAmount))
                sb.AppendLine($"- Total saved: {currentAmount:N2}");
            if (summaryDict.TryGetValue("overallProgress", out var progress))
                sb.AppendLine($"- Overall progress: {progress:N1}%");
            if (summaryDict.TryGetValue("completedGoals", out var completedGoals) && Convert.ToInt32(completedGoals) > 0)
                sb.AppendLine($"- Completed goals: {completedGoals}");

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not retrieve savings goals summary for user {UserId}", userId);
        }
    }

    /// <summary>
    /// Converts an anonymous object to a dictionary for property access.
    /// </summary>
    private static Dictionary<string, object?>? ConvertToDict(object obj)
    {
        if (obj == null) return null;

        try
        {
            // Use reflection to get properties from anonymous object
            var type = obj.GetType();
            var props = type.GetProperties();
            var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            foreach (var prop in props)
            {
                dict[prop.Name] = prop.GetValue(obj);
            }

            return dict;
        }
        catch
        {
            return null;
        }
    }
}
