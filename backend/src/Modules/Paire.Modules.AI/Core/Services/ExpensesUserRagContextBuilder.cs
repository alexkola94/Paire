using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Core.DTOs;
using Paire.Modules.Finance.Infrastructure;

namespace Paire.Modules.AI.Core.Services;

/// <summary>
/// Builds a markdown financial summary for RAG (Thinking mode) using Analytics and Finance data.
/// </summary>
public class ExpensesUserRagContextBuilder : IUserRagContextBuilder
{
    private readonly IAnalyticsService _analyticsService;
    private readonly FinanceDbContext _financeContext;
    private readonly ILogger<ExpensesUserRagContextBuilder> _logger;

    public ExpensesUserRagContextBuilder(
        IAnalyticsService analyticsService,
        FinanceDbContext financeContext,
        ILogger<ExpensesUserRagContextBuilder> logger)
    {
        _analyticsService = analyticsService;
        _financeContext = financeContext;
        _logger = logger;
    }

    public async Task<(string Content, string DocumentTitle)> BuildContextAsync(string userId, CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        var now = DateTime.UtcNow;
        var currentMonthLabel = now.ToString("MMMM yyyy");

        sb.AppendLine("# Financial Summary");
        sb.AppendLine();
        sb.AppendLine($"Generated: {now:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine($"Current month: {currentMonthLabel}");
        sb.AppendLine();

        try
        {
            var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
            sb.AppendLine("## Current Month Overview");
            sb.AppendLine();
            sb.AppendLine($"- **Income:** {dashboard.CurrentMonthIncome:N2}");
            sb.AppendLine($"- **Expenses:** {dashboard.CurrentMonthExpenses:N2}");
            sb.AppendLine($"- **Balance:** {dashboard.CurrentMonthBalance:N2}");
            if (dashboard.TopCategories?.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine("### Top spending categories");
                foreach (var c in dashboard.TopCategories.Take(8))
                    sb.AppendLine($"- {c.Category}: {c.Amount:N2}");
            }
            sb.AppendLine();
            if (dashboard.ActiveLoansCount > 0)
                sb.AppendLine($"- **Active loans:** {dashboard.ActiveLoansCount}, Total outstanding: {dashboard.TotalOutstandingLoans:N2}");
            sb.AppendLine();

            if (Guid.TryParse(userId, out var userGuid))
            {
                var household = await _analyticsService.GetHouseholdAnalyticsAsync(userId);
                if (household.BudgetProgress?.Count > 0)
                {
                    sb.AppendLine("## Budgets");
                    foreach (var b in household.BudgetProgress.Take(10))
                        sb.AppendLine($"- {b.Category}: Spent {b.Spent:N2} of {b.Budgeted:N2}" + (b.IsOverBudget ? " (over budget)" : ""));
                    sb.AppendLine();
                }
                if (household.SavingsProgress?.Count > 0)
                {
                    sb.AppendLine("## Savings goals");
                    foreach (var s in household.SavingsProgress.Take(10))
                        sb.AppendLine($"- {s.Name}: {s.CurrentAmount:N2} / {s.TargetAmount:N2} ({s.Percentage:F0}%)");
                    sb.AppendLine();
                }
                if (household.UpcomingBills?.Count > 0)
                {
                    sb.AppendLine("## Upcoming recurring bills");
                    foreach (var b in household.UpcomingBills.Take(10))
                        sb.AppendLine($"- {b.Name}: {b.Amount:N2} (due {b.DueDate:yyyy-MM-dd})");
                    sb.AppendLine();
                }

                var loans = await _financeContext.Loans
                    .Where(l => l.UserId == userId && !l.IsSettled)
                    .Take(15)
                    .ToListAsync(cancellationToken);
                if (loans.Count > 0)
                {
                    sb.AppendLine("## Active loans");
                    foreach (var l in loans)
                        sb.AppendLine($"- {l.Description ?? $"{l.LentBy} / {l.BorrowedBy}"}: Remaining {l.RemainingAmount:N2}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building RAG context for user {UserId}", userId);
            sb.AppendLine("*Some financial data could not be retrieved.*");
        }

        return (sb.ToString(), "Financial Summary");
    }
}
