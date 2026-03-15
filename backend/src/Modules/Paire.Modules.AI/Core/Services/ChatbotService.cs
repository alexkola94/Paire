using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.DTOs;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.Analytics.Core.Interfaces;

namespace Paire.Modules.AI.Core.Services;

/// <summary>
/// Rule-based financial chatbot using pattern matching and Analytics data.
/// </summary>
public class ChatbotService : IChatbotService
{
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger<ChatbotService> _logger;

    private static readonly Dictionary<string, List<string>> QueryPatterns = new(StringComparer.OrdinalIgnoreCase)
    {
        ["total_spending"] = new() { "how much.*spent", "total.*spending", "what.*spent", "spending.*total", "my spending", "all.*expenses", "expenses.*total" },
        ["monthly_spending"] = new() { "spent.*month", "spending.*month", "monthly.*spending", "this month.*expenses", "expenses this month" },
        ["daily_average"] = new() { "average.*day", "daily.*average", "spending.*per day", "daily.*expenses", "average daily" },
        ["total_income"] = new() { "how much.*earned", "total.*income", "income.*total", "my income", "earnings" },
        ["current_balance"] = new() { "what.*balance", "current.*balance", "how much.*left", "my balance", "net.*balance" },
        ["top_categories"] = new() { "top.*expenses", "top.*categories", "biggest.*expenses", "spending.*breakdown", "expenses by category" },
        ["budget_status"] = new() { "budget.*status", "within.*budget", "over.*budget", "my budget", "budget.*progress" },
        ["savings_goals"] = new() { "savings.*goal", "goal.*progress", "my goals", "saving goals", "goal progress" },
        ["loan_status"] = new() { "loan.*status", "active.*loans", "total.*loans", "how much.*owed", "my loans", "debt" },
        ["spending_insights"] = new() { "insights", "analysis", "financial.*health", "spending.*pattern", "financial.*overview" },
        ["help"] = new() { "help", "what.*can.*do", "how.*use", "what.*questions" }
    };

    private static readonly Dictionary<string, List<string>> SuggestionsEn = new()
    {
        ["en"] = new() { "How much did I spend this month?", "What's my current balance?", "What did I spend on groceries?", "Show me my top expenses", "What's my daily average spending?", "How are my budgets doing?" },
        ["el"] = new() { "Πόσο ξόδεψα αυτόν τον μήνα;", "Ποιο είναι το τρέχον υπόλοιπό μου;", "Τι ξόδεψα σε είδη παντοπωλείου;", "Δείξε μου τις κορυφαίες δαπάνες μου", "Ποιο είναι το ημερήσιο μέσο όρο δαπανών μου;" },
        ["es"] = new() { "¿Cuánto gasté este mes?", "¿Cuál es mi saldo actual?", "¿En qué gasté en comestibles?", "Muéstrame mis mayores gastos", "¿Cuál es mi gasto diario promedio?" },
        ["fr"] = new() { "Combien ai-je dépensé ce mois-ci ?", "Quel est mon solde actuel ?", "Combien ai-je dépensé en épicerie ?", "Montrez-moi mes principales dépenses", "Quel est mon dépense quotidienne moyenne ?" }
    };

    public ChatbotService(IAnalyticsService analyticsService, ILogger<ChatbotService> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    public async Task<ChatbotResponseDto> ProcessQueryAsync(string userId, string query, List<ChatMessageDto>? history, string language = "en", CancellationToken cancellationToken = default)
    {
        var normalized = (query ?? "").Trim();
        if (string.IsNullOrEmpty(normalized))
            return new ChatbotResponseDto { Message = "Please ask a question about your finances.", Type = "text" };

        var key = MatchQueryType(normalized);
        var lang = language?.ToLowerInvariant() ?? "en";
        if (string.IsNullOrEmpty(lang) || lang.Length > 5) lang = "en";

        try
        {
            return key switch
            {
                "total_spending" => await HandleTotalSpendingAsync(userId, lang, cancellationToken),
                "monthly_spending" => await HandleMonthlySpendingAsync(userId, lang, cancellationToken),
                "daily_average" => await HandleDailyAverageAsync(userId, lang, cancellationToken),
                "total_income" => await HandleTotalIncomeAsync(userId, lang, cancellationToken),
                "current_balance" => await HandleCurrentBalanceAsync(userId, lang, cancellationToken),
                "top_categories" => await HandleTopCategoriesAsync(userId, lang, cancellationToken),
                "budget_status" => await HandleBudgetStatusAsync(userId, lang, cancellationToken),
                "savings_goals" => await HandleSavingsGoalsAsync(userId, lang, cancellationToken),
                "loan_status" => await HandleLoanStatusAsync(userId, lang, cancellationToken),
                "spending_insights" => await HandleInsightsAsync(userId, lang, cancellationToken),
                "help" => HandleHelp(lang),
                _ => await HandleFallbackAsync(userId, lang, cancellationToken)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chatbot error for user {UserId}, query type {Key}", userId, key);
            return new ChatbotResponseDto
            {
                Message = "I couldn't fetch that right now. Try again in a moment or check your Dashboard.",
                Type = "text",
                QuickActions = new List<string> { "View Dashboard", "Try again" },
                ActionLink = "/dashboard"
            };
        }
    }

    public Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en", CancellationToken cancellationToken = default)
    {
        var lang = (language ?? "en").ToLowerInvariant();
        if (!SuggestionsEn.TryGetValue(lang, out var list))
            list = SuggestionsEn["en"];
        return Task.FromResult(list);
    }

    private static string MatchQueryType(string query)
    {
        var lower = query.ToLowerInvariant();
        foreach (var (key, patterns) in QueryPatterns)
        {
            foreach (var pattern in patterns)
            {
                try
                {
                    if (Regex.IsMatch(lower, pattern, RegexOptions.IgnoreCase))
                        return key;
                }
                catch { /* skip bad pattern */ }
            }
        }
        return "";
    }

    private async Task<ChatbotResponseDto> HandleTotalSpendingAsync(string userId, string lang, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var summary = await _analyticsService.GetFinancialMonthSummaryAsync(userId, now.Year, now.Month);
        var msg = lang == "el"
            ? $"Αυτόν τον μήνα ξόδεψες συνολικά {summary.Expenses:N2} ευρώ. Έσοδα: {summary.Income:N2}, Υπόλοιπο: {summary.Balance:N2}."
            : $"This month you've spent a total of {summary.Expenses:N2}. Income: {summary.Income:N2}, Balance: {summary.Balance:N2}.";
        return new ChatbotResponseDto
        {
            Message = msg,
            Type = "insight",
            Data = new { summary.Expenses, summary.Income, summary.Balance },
            QuickActions = new List<string> { "Show top categories", "View Dashboard" },
            ActionLink = "/dashboard"
        };
    }

    private async Task<ChatbotResponseDto> HandleMonthlySpendingAsync(string userId, string lang, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var summary = await _analyticsService.GetFinancialMonthSummaryAsync(userId, now.Year, now.Month);
        var msg = lang == "el"
            ? $"Τα έξοδα για {now:MMMM yyyy} είναι {summary.Expenses:N2}."
            : $"Your spending for {now:MMMM yyyy} is {summary.Expenses:N2}.";
        return new ChatbotResponseDto { Message = msg, Type = "insight", ActionLink = "/dashboard" };
    }

    private async Task<ChatbotResponseDto> HandleDailyAverageAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        var now = DateTime.UtcNow;
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var daysElapsed = Math.Max(1, now.Day);
        var dailyAvg = daysElapsed > 0 ? dashboard.CurrentMonthExpenses / daysElapsed : 0;
        var msg = lang == "el"
            ? $"Ο ημερήσιος μέσος όρος δαπανών μέχρι σήμερα είναι {dailyAvg:N2}."
            : $"Your daily average spending so far this month is {dailyAvg:N2}.";
        return new ChatbotResponseDto { Message = msg, Type = "insight", ActionLink = "/dashboard" };
    }

    private async Task<ChatbotResponseDto> HandleTotalIncomeAsync(string userId, string lang, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var summary = await _analyticsService.GetFinancialMonthSummaryAsync(userId, now.Year, now.Month);
        var msg = lang == "el"
            ? $"Τα έσοδά σου αυτόν τον μήνα είναι {summary.Income:N2}."
            : $"Your income this month is {summary.Income:N2}.";
        return new ChatbotResponseDto { Message = msg, Type = "insight", ActionLink = "/dashboard" };
    }

    private async Task<ChatbotResponseDto> HandleCurrentBalanceAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        var msg = lang == "el"
            ? $"Το τρέχον υπόλοιπο (έσοδα − έξοδα) είναι {dashboard.CurrentMonthBalance:N2}."
            : $"Your current balance (income minus expenses) this month is {dashboard.CurrentMonthBalance:N2}.";
        return new ChatbotResponseDto
        {
            Message = msg,
            Type = "insight",
            Data = new { dashboard.CurrentMonthBalance, dashboard.CurrentMonthIncome, dashboard.CurrentMonthExpenses },
            ActionLink = "/dashboard"
        };
    }

    private async Task<ChatbotResponseDto> HandleTopCategoriesAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        if (dashboard.TopCategories == null || dashboard.TopCategories.Count == 0)
        {
            var msg = lang == "el" ? "Δεν υπάρχουν ακόμα κατηγορίες δαπανών αυτόν τον μήνα." : "No spending by category yet this month.";
            return new ChatbotResponseDto { Message = msg, Type = "text", ActionLink = "/dashboard" };
        }
        var lines = dashboard.TopCategories.Take(8).Select(c => $"- {c.Category}: {c.Amount:N2}");
        var text = string.Join("\n", lines);
        var msg2 = lang == "el" ? "Κορυφαίες κατηγορίες δαπανών:\n" + text : "Top spending categories:\n" + text;
        return new ChatbotResponseDto { Message = msg2, Type = "insight", Data = dashboard.TopCategories, ActionLink = "/dashboard" };
    }

    private async Task<ChatbotResponseDto> HandleBudgetStatusAsync(string userId, string lang, CancellationToken ct)
    {
        var household = await _analyticsService.GetHouseholdAnalyticsAsync(userId);
        if (household.BudgetProgress == null || household.BudgetProgress.Count == 0)
        {
            var msg = lang == "el" ? "Δεν έχεις ορίσει προϋπολογισμούς." : "You don't have any budgets set up.";
            return new ChatbotResponseDto { Message = msg, Type = "text", ActionLink = "/budgets" };
        }
        var over = household.BudgetProgress.Where(b => b.IsOverBudget).ToList();
        var msg2 = over.Count == 0
            ? (lang == "el" ? "Είσαι εντός προϋπολογισμού σε όλες τις κατηγορίες." : "You're within budget in all categories.")
            : (lang == "el" ? $"Ξεπέρασες τον προϋπολογισμό σε {over.Count} κατηγορία(ες)." : $"You're over budget in {over.Count} category(ies).");
        return new ChatbotResponseDto { Message = msg2, Type = "insight", Data = household.BudgetProgress, ActionLink = "/budgets" };
    }

    private async Task<ChatbotResponseDto> HandleSavingsGoalsAsync(string userId, string lang, CancellationToken ct)
    {
        var household = await _analyticsService.GetHouseholdAnalyticsAsync(userId);
        if (household.SavingsProgress == null || household.SavingsProgress.Count == 0)
        {
            var msg = lang == "el" ? "Δεν έχεις στόχους αποταμίευσης." : "You don't have any savings goals yet.";
            return new ChatbotResponseDto { Message = msg, Type = "text", ActionLink = "/savings-goals" };
        }
        var lines = household.SavingsProgress.Take(5).Select(s => $"- {s.Name}: {s.CurrentAmount:N2} / {s.TargetAmount:N2} ({s.Percentage:F0}%)");
        var text = string.Join("\n", lines);
        var msg2 = (lang == "el" ? "Πρόοδος στόχων:\n" : "Savings goal progress:\n") + text;
        return new ChatbotResponseDto { Message = msg2, Type = "insight", ActionLink = "/savings-goals" };
    }

    private async Task<ChatbotResponseDto> HandleLoanStatusAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        if (dashboard.ActiveLoansCount == 0)
        {
            var msg = lang == "el" ? "Δεν έχεις ενεργά δάνεια." : "You have no active loans.";
            return new ChatbotResponseDto { Message = msg, Type = "text", ActionLink = "/loans" };
        }
        var msg2 = lang == "el"
            ? $"Έχεις {dashboard.ActiveLoansCount} ενεργά δάνεια. Συνολικό υπόλοιπο: {dashboard.TotalOutstandingLoans:N2}."
            : $"You have {dashboard.ActiveLoansCount} active loan(s). Total outstanding: {dashboard.TotalOutstandingLoans:N2}.";
        return new ChatbotResponseDto { Message = msg2, Type = "insight", ActionLink = "/loans" };
    }

    private async Task<ChatbotResponseDto> HandleInsightsAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        var msg = lang == "el"
            ? $"Επισκόπηση: Έσοδα {dashboard.CurrentMonthIncome:N2}, Έξοδα {dashboard.CurrentMonthExpenses:N2}, Υπόλοιπο {dashboard.CurrentMonthBalance:N2}. Αλλαγή σε σχέση με προηγούμενο μήνα: {dashboard.ChangePercentage:F1}%."
            : $"Overview: Income {dashboard.CurrentMonthIncome:N2}, Expenses {dashboard.CurrentMonthExpenses:N2}, Balance {dashboard.CurrentMonthBalance:N2}. Change vs last month: {dashboard.ChangePercentage:F1}%.";
        return new ChatbotResponseDto { Message = msg, Type = "insight", Data = new { dashboard.TopCategories }, ActionLink = "/dashboard" };
    }

    private static ChatbotResponseDto HandleHelp(string lang)
    {
        var msg = lang == "el"
            ? "Μπορείς να ρωτήσεις: πόσο ξόδεψα αυτόν τον μήνα, ποιο είναι το υπόλοιπό μου, κορυφαίες δαπάνες, προϋπολογισμοί, στόχοι αποταμίευσης, δάνεια. Για πιο προχωρημένες απαντήσεις χρησιμοποίησε τη λειτουργία \"Deep Think\"."
            : "You can ask: how much did I spend this month, what's my balance, top expenses, budgets, savings goals, loans. For deeper answers use \"Deep Think\" mode.";
        return new ChatbotResponseDto { Message = msg, Type = "text", QuickActions = new List<string> { "View Dashboard", "My top expenses" }, ActionLink = "/dashboard" };
    }

    private async Task<ChatbotResponseDto> HandleFallbackAsync(string userId, string lang, CancellationToken ct)
    {
        var dashboard = await _analyticsService.GetDashboardAnalyticsAsync(userId);
        var msg = lang == "el"
            ? $"Για το τρέχον μήνα: Έσοδα {dashboard.CurrentMonthIncome:N2}, Έξοδα {dashboard.CurrentMonthExpenses:N2}, Υπόλοιπο {dashboard.CurrentMonthBalance:N2}. Ρώτα συγκεκριμένα π.χ. \"πόσο ξόδεψα;\" ή \"κορυφαίες δαπάνες\"."
            : $"This month: Income {dashboard.CurrentMonthIncome:N2}, Expenses {dashboard.CurrentMonthExpenses:N2}, Balance {dashboard.CurrentMonthBalance:N2}. Try asking e.g. \"how much did I spend?\" or \"top expenses\".";
        return new ChatbotResponseDto
        {
            Message = msg,
            Type = "text",
            QuickActions = new List<string> { "How much did I spend?", "Top categories", "View Dashboard" },
            ActionLink = "/dashboard"
        };
    }
}
