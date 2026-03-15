using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.AI.Core.DTOs;
using Paire.Modules.AI.Core.DTOs.AiGateway;
using Paire.Modules.AI.Core.Exceptions;
using Paire.Modules.AI.Core.Interfaces;
using GatewayChatMessageDto = Paire.Modules.AI.Core.DTOs.AiGateway.ChatMessageDto;
using Paire.Modules.AI.Core.Entities;
using Paire.Modules.AI.Core.Options;
using Paire.Modules.AI.Core.Services;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.AI.Api.Controllers;

/// <summary>
/// Proxy to optional AI Microservice Gateway (generate, chat) and RAG (rag-query, rag-refresh).
/// </summary>
[Authorize]
[ApiController]
[Route("api/ai-gateway")]
public class AiGatewayController : BaseApiController
{
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IRagClient _ragClient;
    private readonly IRagContextService _ragContextService;
    private readonly IUserRagContextBuilder _contextBuilder;
    private readonly ChatbotPersonalityService _personalityService;
    private readonly IConversationService _conversationService;
    private readonly AiGatewayOptions _options;
    private readonly RagServiceOptions _ragOptions;
    private readonly ILogger<AiGatewayController> _logger;

    public AiGatewayController(
        IAiGatewayClient aiGatewayClient,
        IRagClient ragClient,
        IRagContextService ragContextService,
        IUserRagContextBuilder contextBuilder,
        ChatbotPersonalityService personalityService,
        IConversationService conversationService,
        Microsoft.Extensions.Options.IOptions<AiGatewayOptions> options,
        Microsoft.Extensions.Options.IOptions<RagServiceOptions> ragOptions,
        ILogger<AiGatewayController> logger)
    {
        _aiGatewayClient = aiGatewayClient;
        _ragClient = ragClient;
        _ragContextService = ragContextService;
        _contextBuilder = contextBuilder;
        _personalityService = personalityService;
        _conversationService = conversationService;
        _options = options.Value;
        _ragOptions = ragOptions.Value;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateRequest request, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
            return StatusCode(503, new { error = "AI Gateway is not configured or disabled.", message = "Set AiGateway:Enabled to true and configure BaseUrl and TenantId." });
        if (string.IsNullOrWhiteSpace(request?.Prompt))
            return BadRequest(new { error = "Prompt is required." });

        var accessToken = GetBearerToken();
        if (string.IsNullOrEmpty(accessToken) && string.IsNullOrEmpty(_options.GatewaySecret))
            return Unauthorized(new { error = "Authorization token or gateway secret required." });

        var userIdStr = GetCurrentUserId();
        if (!string.IsNullOrEmpty(userIdStr))
        {
            var personality = await _personalityService.GetPersonalityAsync(userIdStr);
            var systemPrompt = _personalityService.GetSystemPromptForPersonality(personality);
            request = new GenerateRequest
            {
                Prompt = systemPrompt + "\n\nUser query: " + request.Prompt,
                Model = request.Model,
                Temperature = request.Temperature,
                MaxTokens = request.MaxTokens,
                SystemPrompt = request.SystemPrompt,
                SkipPolishing = request.SkipPolishing
            };
        }

        try
        {
            var response = await _aiGatewayClient.GenerateAsync(request, accessToken, cancellationToken);
            return Ok(response);
        }
        catch (RemoteServiceException ex)
        {
            _logger.LogWarning(ex, "AI Gateway generate request failed: {Detail}", ex.ResponseBody);
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message, detail = ex.ResponseBody });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI Gateway generate request failed.");
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message });
        }
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
            return StatusCode(503, new { error = "AI Gateway is not configured or disabled.", message = "Set AiGateway:Enabled to true and configure BaseUrl and TenantId." });
        if (request?.Messages == null || request.Messages.Count == 0)
            return BadRequest(new { error = "At least one message is required." });

        var accessToken = GetBearerToken();
        if (string.IsNullOrEmpty(accessToken) && string.IsNullOrEmpty(_options.GatewaySecret))
            return Unauthorized(new { error = "Authorization token or gateway secret required." });

        var userIdStr = GetCurrentUserId();
        if (!string.IsNullOrEmpty(userIdStr))
        {
            var personality = await _personalityService.GetPersonalityAsync(userIdStr);
            var systemPrompt = _personalityService.GetSystemPromptForPersonality(personality);
            var systemMessage = new GatewayChatMessageDto { Role = "system", Content = systemPrompt };
            request = new ChatRequest
            {
                Messages = new List<GatewayChatMessageDto> { systemMessage }.Concat(request.Messages).ToList(),
                Model = request.Model,
                Temperature = request.Temperature,
                MaxTokens = request.MaxTokens,
                Stream = request.Stream,
                SkipPolishing = request.SkipPolishing
            };
        }

        try
        {
            var response = await _aiGatewayClient.ChatAsync(request, accessToken, cancellationToken);
            return Ok(response);
        }
        catch (RemoteServiceException ex)
        {
            _logger.LogWarning(ex, "AI Gateway chat request failed: {Detail}", ex.ResponseBody);
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message, detail = ex.ResponseBody });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI Gateway chat request failed.");
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message });
        }
    }

    [HttpPost("rag-query")]
    public async Task<IActionResult> RagQuery([FromBody] RagQueryRequest request, CancellationToken cancellationToken)
    {
        if (!_ragOptions.Enabled)
            return StatusCode(503, new { error = "RAG service is not configured or disabled.", message = "Set RagService:Enabled to true and configure BaseUrl and TenantId." });
        if (string.IsNullOrWhiteSpace(request?.Query))
            return BadRequest(new { error = "Query is required." });

        var accessToken = GetBearerToken();
        if (string.IsNullOrEmpty(accessToken) && string.IsNullOrEmpty(_ragOptions.GatewaySecret))
            return Unauthorized(new { error = "Authorization token or gateway secret required." });

        string? userCategory = null;
        Guid? userIdParsed = null;
        var userIdStr = GetCurrentUserId();

        if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userId))
        {
            userIdParsed = userId;
            try
            {
                userCategory = await _ragContextService.EnsureUserContextAsync(userId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync RAG context for user {UserId}, proceeding without user-specific context", userId);
            }
        }

        Conversation? conversation = null;
        if (!string.IsNullOrEmpty(userIdStr))
        {
            try
            {
                conversation = await _conversationService.GetOrCreateConversationAsync(userIdStr, request.ConversationId, cancellationToken);
                await _conversationService.SaveMessageAsync(conversation.Id, "user", request.Query, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist user message for conversation");
            }
        }

        try
        {
            var response = await _ragClient.RagQueryAsync(request, userCategory, accessToken, cancellationToken);

            if (_options.Enabled && !response.RagUsed && response.ChunksRetrieved == 0 && userIdParsed.HasValue && !string.IsNullOrEmpty(userCategory))
            {
                try
                {
                    var (content, _) = await _contextBuilder.BuildContextAsync(userIdParsed.Value.ToString(), cancellationToken);
                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        const int maxContextLength = 6000;
                        var contextToUse = content.Length <= maxContextLength ? content : content.Substring(0, maxContextLength) + "\n\n[Context truncated for length.]";
                        var enhancedPrompt = BuildRagStyleEnhancedPrompt(request.Query, contextToUse, request.ConversationHistory);
                        var genRequest = new GenerateRequest
                        {
                            Prompt = enhancedPrompt,
                            MaxTokens = 1024,
                            Temperature = 0.7,
                            SkipPolishing = true
                        };
                        var aiResponse = await _aiGatewayClient.GenerateAsync(genRequest, accessToken, cancellationToken);
                        var answer = aiResponse.Response ?? "";
                        if (conversation != null)
                        {
                            try { await _conversationService.SaveMessageAsync(conversation.Id, "assistant", answer, cancellationToken); }
                            catch { /* non-critical */ }
                        }
                        return Ok(new { answer, sources = response.Sources });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "RAG fallback to generate failed");
                }
            }

            if (conversation != null && !string.IsNullOrEmpty(response.Answer))
            {
                try { await _conversationService.SaveMessageAsync(conversation.Id, "assistant", response.Answer, cancellationToken); }
                catch { /* non-critical */ }
            }

            return Ok(new { answer = response.Answer, sources = response.Sources });
        }
        catch (RemoteServiceException ex)
        {
            _logger.LogWarning(ex, "RAG query request failed: {Detail}", ex.ResponseBody);
            return StatusCode(502, new { error = "RAG service request failed.", message = ex.Message, detail = ex.ResponseBody });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "RAG query request failed.");
            return StatusCode(502, new { error = "RAG service request failed.", message = ex.Message });
        }
    }

    [HttpPost("rag-refresh")]
    public async Task<IActionResult> RagRefresh(CancellationToken cancellationToken)
    {
        if (!_ragOptions.Enabled)
            return StatusCode(503, new { error = "RAG service is not configured or disabled." });

        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            await _ragContextService.ForceRefreshUserContextAsync(userId, cancellationToken);
            return Ok(new { message = "RAG context refreshed." });
        }
        catch (RemoteServiceException ex)
        {
            _logger.LogWarning(ex, "RAG refresh failed: {Detail}", ex.ResponseBody);
            return StatusCode(502, new { error = "RAG service request failed.", message = ex.Message, detail = ex.ResponseBody });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "RAG refresh failed.");
            return StatusCode(502, new { error = "RAG service request failed.", message = ex.Message });
        }
    }

    private static string BuildRagStyleEnhancedPrompt(string query, string context, List<RagConversationMessage>? history)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Use the following context to answer the user's question. If the context does not contain relevant information, say so.");
        sb.AppendLine();
        sb.AppendLine("--- Context ---");
        sb.AppendLine(context);
        sb.AppendLine("--- End context ---");
        sb.AppendLine();
        if (history != null && history.Count > 0)
        {
            foreach (var m in history.TakeLast(5))
                sb.AppendLine($"{m.Role}: {m.Content}");
            sb.AppendLine();
        }
        sb.AppendLine($"User: {query}");
        sb.AppendLine("Assistant:");
        return sb.ToString();
    }

    private string? GetBearerToken()
    {
        var auth = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return auth.Substring("Bearer ".Length).Trim();
    }
}
