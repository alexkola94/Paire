using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Configuration;
using YouAndMeExpensesAPI.DTOs.AiGateway;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers;

/// <summary>
/// Proxy to the optional AI Microservice Gateway (generate and chat).
/// Requires AiGateway:Enabled and valid config; forwards user JWT to the gateway.
/// RAG queries automatically sync user-specific financial context for enhanced responses.
/// </summary>
[Route("api/ai-gateway")]
[ApiController]
[Authorize]
public class AiGatewayController : BaseApiController
{
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IRagClient _ragClient;
    private readonly IRagContextService _ragContextService;
    private readonly AiGatewayOptions _options;
    private readonly RagServiceOptions _ragOptions;
    private readonly ILogger<AiGatewayController> _logger;

    public AiGatewayController(
        IAiGatewayClient aiGatewayClient,
        IRagClient ragClient,
        IRagContextService ragContextService,
        Microsoft.Extensions.Options.IOptions<AiGatewayOptions> options,
        Microsoft.Extensions.Options.IOptions<RagServiceOptions> ragOptions,
        ILogger<AiGatewayController> logger)
    {
        _aiGatewayClient = aiGatewayClient;
        _ragClient = ragClient;
        _ragContextService = ragContextService;
        _options = options.Value;
        _ragOptions = ragOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/ai-gateway/generate - single prompt completion via AI Gateway.
    /// </summary>
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

        try
        {
            var response = await _aiGatewayClient.GenerateAsync(request, accessToken, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI Gateway generate request failed.");
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/ai-gateway/chat - multi-turn chat via AI Gateway (aggregated response).
    /// </summary>
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

        try
        {
            var response = await _aiGatewayClient.ChatAsync(request, accessToken, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI Gateway chat request failed.");
            return StatusCode(502, new { error = "AI Gateway request failed.", message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/ai-gateway/rag-query - RAG-enhanced query (Thinking mode). Proxies to RAG service.
    /// Automatically ensures user's financial context is synced to RAG for personalized responses.
    /// </summary>
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

        // Get current user ID for per-user context
        var userIdStr = GetCurrentUserId();
        string? userCategory = null;

        if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userId))
        {
            try
            {
                // Ensure user's financial context is synced to RAG (lazy sync)
                // This will create/update the user's summary if missing or stale
                userCategory = await _ragContextService.EnsureUserContextAsync(userId, cancellationToken);
                _logger.LogDebug("RAG query for user {UserId} with category {Category}", userId, userCategory);
            }
            catch (Exception ex)
            {
                // Don't fail the request if context sync fails
                _logger.LogWarning(ex, "Failed to sync RAG context for user {UserId}, proceeding without user-specific context", userId);
            }
        }
        else
        {
            _logger.LogWarning("Could not determine user ID for RAG query, proceeding without user-specific context");
        }

        try
        {
            // Pass user category to filter RAG retrieval to user's documents
            var response = await _ragClient.RagQueryAsync(request, userCategory, accessToken, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "RAG service request failed.");
            return StatusCode(502, new { error = "RAG service request failed.", message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/ai-gateway/rag-refresh - Force refresh the current user's RAG context.
    /// Use this after significant data changes to ensure RAG has the latest financial summary.
    /// </summary>
    [HttpPost("rag-refresh")]
    public async Task<IActionResult> RagRefresh(CancellationToken cancellationToken)
    {
        if (!_ragOptions.Enabled)
            return StatusCode(503, new { error = "RAG service is not configured or disabled." });

        var userIdStr = GetCurrentUserId();
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { error = "User ID could not be determined." });

        try
        {
            await _ragContextService.ForceRefreshUserContextAsync(userId, cancellationToken);
            return Ok(new { message = "RAG context refreshed successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh RAG context for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to refresh RAG context.", message = ex.Message });
        }
    }

    private string? GetBearerToken()
    {
        var auth = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return auth["Bearer ".Length..].Trim();
    }
}
