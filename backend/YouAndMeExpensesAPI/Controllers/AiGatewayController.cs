using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Configuration;
using YouAndMeExpensesAPI.DTOs.AiGateway;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers;

/// <summary>
/// Proxy to the optional AI Microservice Gateway (generate and chat).
/// Requires AiGateway:Enabled and valid config; forwards user JWT to the gateway.
/// </summary>
[Route("api/ai-gateway")]
[ApiController]
[Authorize]
public class AiGatewayController : BaseApiController
{
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly AiGatewayOptions _options;
    private readonly ILogger<AiGatewayController> _logger;

    public AiGatewayController(
        IAiGatewayClient aiGatewayClient,
        Microsoft.Extensions.Options.IOptions<AiGatewayOptions> options,
        ILogger<AiGatewayController> logger)
    {
        _aiGatewayClient = aiGatewayClient;
        _options = options.Value;
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

    private string? GetBearerToken()
    {
        var auth = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return auth["Bearer ".Length..].Trim();
    }
}
