using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers;

/// <summary>
/// System controller for health checks, diagnostics, and warmup of downstream services.
/// </summary>
[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    private readonly ISystemService _systemService;
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IRagClient _ragClient;
    private readonly IShieldAuthService _shieldAuthService;
    private readonly ILogger<SystemController> _logger;

    public SystemController(
        ISystemService systemService,
        IAiGatewayClient aiGatewayClient,
        IRagClient ragClient,
        IShieldAuthService shieldAuthService,
        ILogger<SystemController> logger)
    {
        _systemService = systemService;
        _aiGatewayClient = aiGatewayClient;
        _ragClient = ragClient;
        _shieldAuthService = shieldAuthService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/system/warmup - trigger background warmup pings to downstream services
    /// (AI Gateway, RAG service, Shield Auth) to reduce Render.com cold-start latency.
    /// </summary>
    [HttpGet("warmup")]
    [AllowAnonymous]
    public async Task<IActionResult> Warmup(CancellationToken cancellationToken)
    {
        var tasks = new List<Task>();

        try
        {
            tasks.Add(_aiGatewayClient.PingAiAsync(cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to schedule AI Gateway warmup.");
        }

        try
        {
            tasks.Add(_ragClient.PingRagAsync(cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to schedule RAG warmup.");
        }

        try
        {
            tasks.Add(_shieldAuthService.PingAsync(cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to schedule Shield warmup.");
        }

        if (tasks.Count > 0)
        {
            var warmupTask = Task.WhenAll(tasks);
            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);

            try
            {
                await Task.WhenAny(warmupTask, timeoutTask);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Warmup tasks encountered an error.");
            }
        }

        return Ok(new
        {
            status = "ok",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Health check endpoint.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        var result = await _systemService.GetHealthAsync();
        return Ok(result);
    }

    /// <summary>
    /// API information endpoint.
    /// </summary>
    [HttpGet("info")]
    public async Task<IActionResult> GetInfo()
    {
        try
        {
            var result = await _systemService.GetInfoAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting system info");
            return StatusCode(500, new { message = "Error getting system info", error = ex.Message, stack = ex.StackTrace });
        }
    }

    /// <summary>
    /// Gets the changelog content.
    /// </summary>
    [HttpGet("changelog")]
    public async Task<IActionResult> GetChangelog()
    {
        try
        {
            var result = await _systemService.GetChangelogAsync();

            // Preserve original behavior: if "message" == "Changelog not found" then 404
            var messageProp = result.GetType().GetProperty("message");
            if (messageProp != null)
            {
                var messageValue = messageProp.GetValue(result) as string;
                if (messageValue == "Changelog not found")
                {
                    return NotFound(result);
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading changelog");
            return StatusCode(500, new { message = "Error reading changelog", error = ex.Message, stack = ex.StackTrace });
        }
    }

    /// <summary>
    /// Clears all data from the database (keeps table structure).
    /// WARNING: This is irreversible! Use only in development.
    /// </summary>
    [HttpDelete("clear-data")]
    public async Task<IActionResult> ClearAllData()
    {
        try
        {
            var result = await _systemService.ClearAllDataAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing database data");
            return StatusCode(500, new
            {
                success = false,
                message = "Error clearing data",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Runs a diagnostic test for SMTP connectivity.
    /// </summary>
    [HttpGet("diagnostics/email")]
    public async Task<IActionResult> TestSmtpConnectivity()
    {
        var result = await _systemService.TestSmtpConnectivityAsync();
        return Ok(result);
    }
}

