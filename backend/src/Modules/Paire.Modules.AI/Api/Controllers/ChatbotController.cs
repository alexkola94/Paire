using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.DTOs;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.AI.Core.Services;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.AI.Api.Controllers;

/// <summary>
/// Main financial chatbot API. Rule-based queries and suggestions.
/// </summary>
[Authorize]
[ApiController]
[Route("api/chatbot")]
public class ChatbotController : BaseApiController
{
    private readonly IChatbotService _chatbotService;
    private readonly IConversationService _conversationService;
    private readonly ChatbotPersonalityService _personalityService;
    private readonly ILogger<ChatbotController> _logger;

    public ChatbotController(
        IChatbotService chatbotService,
        IConversationService conversationService,
        ChatbotPersonalityService personalityService,
        ILogger<ChatbotController> logger)
    {
        _chatbotService = chatbotService;
        _conversationService = conversationService;
        _personalityService = personalityService;
        _logger = logger;
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> GetSuggestions([FromQuery] string? language = "en", CancellationToken cancellationToken = default)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var suggestions = await _chatbotService.GetSuggestedQuestionsAsync(userId.ToString(), language ?? "en", cancellationToken);
        return Ok(suggestions);
    }

    [HttpPost("query")]
    public async Task<IActionResult> ProcessQuery([FromBody] ChatbotQueryRequest request, CancellationToken cancellationToken = default)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (string.IsNullOrWhiteSpace(request?.Query))
            return BadRequest(new { message = "Query cannot be empty" });

        try
        {
            var conversation = await _conversationService.GetOrCreateConversationAsync(userId.ToString(), request.ConversationId, cancellationToken);

            List<ChatMessageDto>? history = request.History;
            if (history == null || history.Count == 0)
            {
                var contextMessages = await _conversationService.GetRecentContextAsync(conversation.Id, 10, cancellationToken);
                if (contextMessages.Count > 0)
                    history = contextMessages;
            }

            var language = request.Language ?? "en";
            var response = await _chatbotService.ProcessQueryAsync(userId.ToString(), request.Query, history, language, cancellationToken);
            response = _personalityService.ApplyPersonality(response, await _personalityService.GetPersonalityAsync(userId.ToString()));

            await _conversationService.SaveMessageAsync(conversation.Id, "user", request.Query, cancellationToken);
            if (!string.IsNullOrEmpty(response.Message))
                await _conversationService.SaveMessageAsync(conversation.Id, "assistant", response.Message, cancellationToken);

            return Ok(new
            {
                response.Message,
                response.Type,
                response.Data,
                response.QuickActions,
                response.ActionLink,
                response.CanGenerateReport,
                response.ReportType,
                response.ReportParams,
                conversationId = conversation.Id
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chatbot query for user {UserId}", userId);
            return StatusCode(500, new { message = "Error processing query", error = ex.Message });
        }
    }

    [HttpPost("generate-report")]
    public IActionResult GenerateReport([FromBody] GenerateReportRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        var format = (request?.Format ?? "csv").ToLowerInvariant();
        var contentType = format == "pdf" ? "application/pdf" : "text/csv";
        var ext = format == "pdf" ? "pdf" : "csv";
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
