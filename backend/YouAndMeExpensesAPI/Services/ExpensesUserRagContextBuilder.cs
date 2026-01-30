using System.Text;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Expenses-APP implementation of IUserRagContextBuilder.
/// Builds a comprehensive financial summary for the user including:
/// - Current month income/expenses/balance
/// - Top spending categories
/// - Recent transactions (last 25)
/// - Budget status and limits
/// - Recurring bills with individual details
/// - Savings goals progress
/// - Active loans with details
/// 
/// This content is synced to RAG so "Thinking mode" can answer questions
/// about the user's financial data accurately.
/// </summary>
public class ExpensesUserRagContextBuilder : IUserRagContextBuilder
{
    private readonly IAnalyticsService _analyticsService;
    private readonly IRecurringBillsService _recurringBillsService;
    private readonly ISavingsGoalsService _savingsGoalsService;
    private readonly ITransactionsService _transactionsService;
    private readonly IBudgetsAppService _budgetsService;
    private readonly ILoansService _loansService;
    private readonly ILogger<ExpensesUserRagContextBuilder> _logger;

    public ExpensesUserRagContextBuilder(
        IAnalyticsService analyticsService,
        IRecurringBillsService recurringBillsService,
        ISavingsGoalsService savingsGoalsService,
        ITransactionsService transactionsService,
        IBudgetsAppService budgetsService,
        ILoansService loansService,
        ILogger<ExpensesUserRagContextBuilder> logger)
    {
        _analyticsService = analyticsService;
        _recurringBillsService = recurringBillsService;
        _savingsGoalsService = savingsGoalsService;
        _transactionsService = transactionsService;
        _budgetsService = budgetsService;
        _loansService = loansService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<(string Content, string DocumentTitle)> BuildContextAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        var now = DateTime.UtcNow;
        var currentMonthLabel = now.ToString("MMMM yyyy");

        sb.AppendLine("# Financial Summary");
        sb.AppendLine();
        sb.AppendLine($"Generated: {now:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine($"Current month: {currentMonthLabel}");
        sb.AppendLine($"Report period: {currentMonthLabel} expenses and income.");
        sb.AppendLine();

        try
        {
            // 1. Dashboard analytics (current month overview)
            var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
            AppendDashboardSummary(sb, dashboard, currentMonthLabel);

            if (Guid.TryParse(userId, out var userGuid))
            {
                // 2. Recent transactions (last 25)
                await AppendRecentTransactions(sb, userGuid);

                // 3. Budgets status
                await AppendBudgetsSummary(sb, userGuid);

                // 4. Recurring bills with details
                await AppendRecurringBillsSummary(sb, userGuid);

                // 5. Savings goals with details
                await AppendSavingsGoalsSummary(sb, userGuid);

                // 6. Loans with details
                await AppendLoansSummary(sb, userGuid);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building some sections of RAG context for user {UserId}", userId);
            sb.AppendLine();
            sb.AppendLine("*Note: Some financial data could not be retrieved.*");
        }

        return (sb.ToString(), "Financial Summary");
    }

    /// <summary>
    /// Appends the dashboard analytics summary to the StringBuilder.
    /// </summary>
    private void AppendDashboardSummary(StringBuilder sb, DashboardAnalyticsDTO dashboard, string currentMonthLabel)
    {
        sb.AppendLine("## Current Month Overview");
        sb.AppendLine();
        sb.AppendLine($"- **Income:** {dashboard.CurrentMonthIncome:N2}");
        sb.AppendLine($"- **Expenses:** {dashboard.CurrentMonthExpenses:N2}");
        sb.AppendLine($"- **Balance:** {dashboard.CurrentMonthBalance:N2}");
        sb.AppendLine();

        // Compact breakdown for retrieval: "January 2026 expenses" etc. so one chunk matches date-based queries
        sb.AppendLine($"## {currentMonthLabel} at a glance");
        sb.AppendLine();
        sb.AppendLine($"{currentMonthLabel}: Income {dashboard.CurrentMonthIncome:N2}, Expenses {dashboard.CurrentMonthExpenses:N2}, Balance {dashboard.CurrentMonthBalance:N2}.");
        if (dashboard.TopCategories?.Any() == true)
        {
            var topNames = string.Join(", ", dashboard.TopCategories.Take(5).Select(c => $"{c.Category} ({c.Amount:N2})"));
            sb.AppendLine($"Top spending categories in {currentMonthLabel}: {topNames}.");
        }
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
    /// Appends recent transactions (last 25) for context about spending patterns.
    /// </summary>
    private async Task AppendRecentTransactions(StringBuilder sb, Guid userId)
    {
        try
        {
            // Get last 25 transactions (current month focus)
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            
            var result = await _transactionsService.GetTransactionsAsync(
                userId,
                type: null,
                startDate: startOfMonth.AddMonths(-1), // Include last month for context
                endDate: now,
                page: 1,
                pageSize: 25,
                search: null);

            if (result?.Items == null || !result.Items.Any()) return;

            sb.AppendLine("## Recent Transactions");
            sb.AppendLine();
            sb.AppendLine($"Showing last {result.Items.Count} transactions:");
            sb.AppendLine();

            foreach (var tx in result.Items)
            {
                var typeIndicator = tx.Type?.ToLower() == "income" ? "+" : "-";
                var description = !string.IsNullOrWhiteSpace(tx.Description) 
                    ? tx.Description 
                    : tx.Category ?? "No description";
                
                // Truncate long descriptions
                if (description.Length > 50)
                    description = description[..47] + "...";

                sb.AppendLine($"- {tx.Date:yyyy-MM-dd}: {typeIndicator}{tx.Amount:N2} | {description} ({tx.Category ?? "Uncategorized"})");
            }

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building transactions section for RAG context");
        }
    }

    /// <summary>
    /// Appends budget information showing limits and current spending.
    /// </summary>
    private async Task AppendBudgetsSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            var budgets = await _budgetsService.GetBudgetsWithProfilesAsync(userId);
            if (budgets == null || !budgets.Any()) return;

            sb.AppendLine("## Budgets");
            sb.AppendLine();

            foreach (var budgetObj in budgets)
            {
                var budgetDict = ConvertToDict(budgetObj);
                if (budgetDict == null) continue;

                var category = budgetDict.TryGetValue("category", out var cat) ? cat?.ToString() : "Unknown";
                var limit = budgetDict.TryGetValue("limit", out var lim) ? Convert.ToDecimal(lim) : 0;
                var spent = budgetDict.TryGetValue("spent", out var sp) ? Convert.ToDecimal(sp) : 0;
                var remaining = limit - spent;
                var percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

                var status = percentUsed switch
                {
                    >= 100 => " [OVER BUDGET!]",
                    >= 80 => " [Warning: Near limit]",
                    _ => ""
                };

                sb.AppendLine($"- **{category}**: {spent:N2} / {limit:N2} ({percentUsed:N0}% used, {remaining:N2} remaining){status}");
            }

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building budgets section for RAG context");
        }
    }

    /// <summary>
    /// Appends detailed loan information.
    /// </summary>
    private async Task AppendLoansSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            var loans = await _loansService.GetLoansAsync(userId);
            if (loans == null || !loans.Any()) return;

            sb.AppendLine("## Loans & Debts");
            sb.AppendLine();

            // Get summary first
            var summary = await _loansService.GetLoanSummaryAsync(userId);
            if (summary != null)
            {
                var summaryDict = ConvertToDict(summary);
                if (summaryDict != null)
                {
                    if (summaryDict.TryGetValue("totalLoans", out var total))
                        sb.AppendLine($"- Total loans: {total}");
                    if (summaryDict.TryGetValue("totalOwed", out var owed))
                        sb.AppendLine($"- Total amount owed: {owed:N2}");
                    if (summaryDict.TryGetValue("totalLent", out var lent) && Convert.ToDecimal(lent) > 0)
                        sb.AppendLine($"- Total amount lent to others: {lent:N2}");
                    sb.AppendLine();
                }
            }

            sb.AppendLine("### Loan Details:");
            sb.AppendLine();

            foreach (var loanObj in loans)
            {
                var loanDict = ConvertToDict(loanObj);
                if (loanDict == null) continue;

                var description = loanDict.TryGetValue("description", out var desc) ? desc?.ToString() : "Loan";
                var amount = loanDict.TryGetValue("amount", out var amt) ? Convert.ToDecimal(amt) : 0;
                var remainingAmount = loanDict.TryGetValue("remainingAmount", out var rem) ? Convert.ToDecimal(rem) : amount;
                var loanType = loanDict.TryGetValue("type", out var lt) ? lt?.ToString() : "borrowed";
                var isSettled = loanDict.TryGetValue("isSettled", out var settled) && Convert.ToBoolean(settled);
                var lenderOrBorrower = loanDict.TryGetValue("lenderName", out var name) ? name?.ToString() : 
                                       loanDict.TryGetValue("borrowerName", out var bName) ? bName?.ToString() : "Unknown";

                if (isSettled) continue; // Skip settled loans

                var direction = loanType?.ToLower() == "lent" ? "Lent to" : "Borrowed from";
                sb.AppendLine($"- **{description}**: {direction} {lenderOrBorrower} - {remainingAmount:N2} remaining (original: {amount:N2})");
            }

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building loans section for RAG context");
        }
    }

    /// <summary>
    /// Appends the recurring bills summary to the StringBuilder.
    /// Includes both aggregate stats AND individual bill details for accurate RAG responses.
    /// </summary>
    private async Task AppendRecurringBillsSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            // Get individual bills for detailed listing
            var bills = await _recurringBillsService.GetRecurringBillsAsync(userId);
            if (bills == null || !bills.Any()) return;

            sb.AppendLine("## Recurring Bills & Subscriptions");
            sb.AppendLine();

            // Get summary stats
            var summary = await _recurringBillsService.GetSummaryAsync(userId);
            if (summary != null)
            {
                var summaryDict = ConvertToDict(summary);
                if (summaryDict != null)
                {
                    if (summaryDict.TryGetValue("totalBills", out var totalBills))
                        sb.AppendLine($"- Total bills/subscriptions: {totalBills}");
                    if (summaryDict.TryGetValue("totalMonthlyAmount", out var totalMonthly))
                        sb.AppendLine($"- Total monthly cost: {totalMonthly:N2}");
                    if (summaryDict.TryGetValue("upcomingBills", out var upcomingCount) && Convert.ToInt32(upcomingCount) > 0)
                        sb.AppendLine($"- Upcoming (next 7 days): {upcomingCount}");
                    if (summaryDict.TryGetValue("overdueBills", out var overdueCount) && Convert.ToInt32(overdueCount) > 0)
                        sb.AppendLine($"- **Overdue:** {overdueCount}");
                    sb.AppendLine();
                }
            }

            // List individual bills with their details
            sb.AppendLine("### Your Recurring Bills List:");
            sb.AppendLine();

            foreach (var billObj in bills)
            {
                var billDict = ConvertToDict(billObj);
                if (billDict == null) continue;

                // Extract bill details
                var name = billDict.TryGetValue("name", out var n) ? n?.ToString() : "Unknown";
                var amount = billDict.TryGetValue("amount", out var a) ? Convert.ToDecimal(a) : 0;
                var category = billDict.TryGetValue("category", out var c) ? c?.ToString() : "Other";
                var frequency = billDict.TryGetValue("frequency", out var f) ? f?.ToString() : "monthly";
                var isActive = billDict.TryGetValue("isActive", out var active) && Convert.ToBoolean(active);
                var nextDueDate = billDict.TryGetValue("nextDueDate", out var dueDate) && dueDate != null
                    ? Convert.ToDateTime(dueDate).ToString("yyyy-MM-dd")
                    : "N/A";

                // Format: "- Netflix: €15.99/monthly (Entertainment) - Next due: 2026-02-01"
                var status = isActive ? "" : " [INACTIVE]";
                sb.AppendLine($"- **{name}**: {amount:N2}/{frequency} ({category}){status} - Next due: {nextDueDate}");
            }

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building recurring bills section for RAG context");
            // Optional section; skip on failure
        }
    }

    /// <summary>
    /// Appends the savings goals with individual goal details.
    /// </summary>
    private async Task AppendSavingsGoalsSummary(StringBuilder sb, Guid userId)
    {
        try
        {
            // Get individual goals
            var goals = await _savingsGoalsService.GetSavingsGoalsAsync(userId);
            if (goals == null || !goals.Any()) return;

            sb.AppendLine("## Savings Goals");
            sb.AppendLine();

            // Get summary stats
            var summary = await _savingsGoalsService.GetSummaryAsync(userId);
            if (summary != null)
            {
                var summaryDict = ConvertToDict(summary);
                if (summaryDict != null)
                {
                    if (summaryDict.TryGetValue("totalGoals", out var totalGoals))
                        sb.AppendLine($"- Total goals: {totalGoals}");
                    if (summaryDict.TryGetValue("totalTargetAmount", out var targetAmount))
                        sb.AppendLine($"- Total target: {targetAmount:N2}");
                    if (summaryDict.TryGetValue("totalCurrentAmount", out var currentAmount))
                        sb.AppendLine($"- Total saved: {currentAmount:N2}");
                    if (summaryDict.TryGetValue("overallProgress", out var progress))
                        sb.AppendLine($"- Overall progress: {progress:N1}%");
                    sb.AppendLine();
                }
            }

            sb.AppendLine("### Your Savings Goals:");
            sb.AppendLine();

            foreach (var goalObj in goals)
            {
                var goalDict = ConvertToDict(goalObj);
                if (goalDict == null) continue;

                var name = goalDict.TryGetValue("name", out var n) ? n?.ToString() : "Unnamed Goal";
                var targetAmount = goalDict.TryGetValue("targetAmount", out var target) ? Convert.ToDecimal(target) : 0;
                var currentAmount = goalDict.TryGetValue("currentAmount", out var current) ? Convert.ToDecimal(current) : 0;
                var progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                var targetDate = goalDict.TryGetValue("targetDate", out var td) && td != null
                    ? Convert.ToDateTime(td).ToString("yyyy-MM-dd")
                    : "No deadline";

                var status = progress >= 100 ? " [COMPLETED!]" : "";
                sb.AppendLine($"- **{name}**: {currentAmount:N2} / {targetAmount:N2} ({progress:N0}% complete) - Target date: {targetDate}{status}");
            }

            sb.AppendLine();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error building savings goals section for RAG context");
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
