using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.AI.Api.Controllers;

/// <summary>
/// Main financial chatbot API. Provides suggestions and processes queries.
/// </summary>
[Authorize]
[ApiController]
[Route("api/chatbot")]
public class ChatbotController : BaseApiController
{
    private readonly ILogger<ChatbotController> _logger;

    private static readonly Dictionary<string, List<string>> SuggestionsByLanguage = new()
    {
        ["en"] = new() { "How much did I spend this month?", "What's my current balance?", "What did I spend on groceries?", "Show me my top expenses", "What's my daily average spending?" },
        ["el"] = new() { "Πόσο ξόδεψα αυτόν τον μήνα;", "Ποιο είναι το τρέχον υπόλοιπό μου;", "Τι ξόδεψα σε είδη παντοπωλείου;", "Δείξε μου τις κορυφαίες δαπάνες μου", "Ποιο είναι το ημερήσιο μέσο όρο δαπανών μου;" },
        ["es"] = new() { "¿Cuánto gasté este mes?", "¿Cuál es mi saldo actual?", "¿En qué gasté en comestibles?", "Muéstrame mis mayores gastos", "¿Cuál es mi gasto diario promedio?" },
        ["fr"] = new() { "Combien ai-je dépensé ce mois-ci ?", "Quel est mon solde actuel ?", "Combien ai-je dépensé en épicerie ?", "Montrez-moi mes principales dépenses", "Quel est mon dépense quotidienne moyenne ?" }
    };

    public ChatbotController(ILogger<ChatbotController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Get suggested questions for the chatbot.
    /// </summary>
    [HttpGet("suggestions")]
    public IActionResult GetSuggestions([FromQuery] string? language = "en")
    {
        var lang = (language ?? "en").ToLowerInvariant();
        if (!SuggestionsByLanguage.TryGetValue(lang, out var list))
            list = SuggestionsByLanguage["en"];
        return Ok(list);
    }

    /// <summary>
    /// Process a chatbot query. Returns a simple response (rule-based stub).
    /// Full AI/rule-based logic can be added later.
    /// </summary>
    [HttpPost("query")]
    public IActionResult ProcessQuery([FromBody] ChatbotQueryRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(request?.Query))
            return BadRequest(new { message = "Query cannot be empty" });

        try
        {
            var response = new ChatbotResponseDto
            {
                Message = "I'm your financial assistant. For detailed insights, check your Dashboard and Reports. Full chatbot logic is being migrated to the new architecture.",
                Type = "text",
                QuickActions = new List<string> { "View Dashboard", "View Reports" },
                ActionLink = "/dashboard"
            };
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chatbot query for user {UserId}", userId);
            return StatusCode(500, new { message = "Error processing query", error = ex.Message });
        }
    }

    /// <summary>
    /// Generate a financial report (CSV/PDF). Stub - returns minimal CSV for now.
    /// </summary>
    [HttpPost("generate-report")]
    public IActionResult GenerateReport([FromBody] GenerateReportRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var format = (request?.Format ?? "csv").ToLowerInvariant();
        var contentType = format == "pdf" ? "application/pdf" : "text/csv";
        var ext = format == "pdf" ? "pdf" : "csv";

        // Stub: return minimal CSV. Full report generation can be wired to Analytics/Finance modules later.
        var csv = "Date,Category,Amount,Type\n";
        var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
        return File(bytes, contentType, $"financial_report.{ext}");
    }
}

public class GenerateReportRequest
{
    public string? ReportType { get; set; }
    public string? Format { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Category { get; set; }
    public string? GroupBy { get; set; }
}

public class ChatbotQueryRequest
{
    public string Query { get; set; } = string.Empty;
    public List<ChatMessageDto>? History { get; set; }
    public string? Language { get; set; }
    public Guid? ConversationId { get; set; }
}

public class ChatMessageDto
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
}

public class ChatbotResponseDto
{
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public object? Data { get; set; }
    public List<string>? QuickActions { get; set; }
    public string? ActionLink { get; set; }
    public bool CanGenerateReport { get; set; }
    public string? ReportType { get; set; }
    public object? ReportParams { get; set; }
}
