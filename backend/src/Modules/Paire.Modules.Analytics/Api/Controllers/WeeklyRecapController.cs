using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Entities;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Analytics.Api.Controllers;

[ApiController]
[Route("api/weekly-recap")]
[Authorize]
public class WeeklyRecapController : BaseApiController
{
    private readonly IWeeklyRecapService _weeklyRecapService;
    private readonly ILogger<WeeklyRecapController> _logger;

    public WeeklyRecapController(IWeeklyRecapService weeklyRecapService, ILogger<WeeklyRecapController> logger)
    {
        _weeklyRecapService = weeklyRecapService;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(WeeklyRecap), 200)]
    public async Task<IActionResult> GetLatest()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var recap = await _weeklyRecapService.GetLatestRecapAsync(userId.ToString());
        return Ok(recap);
    }

    [HttpGet("history")]
    [ProducesResponseType(typeof(List<WeeklyRecap>), 200)]
    public async Task<IActionResult> GetHistory([FromQuery] int count = 4)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        var recaps = await _weeklyRecapService.GetRecapHistoryAsync(userId.ToString(), count);
        return Ok(recaps);
    }

    [HttpPost("generate")]
    [ProducesResponseType(typeof(WeeklyRecap), 200)]
    public async Task<IActionResult> Generate()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _weeklyRecapService.GenerateRecapAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error generating recap"); return StatusCode(500, new { error = "Failed to generate recap" }); }
    }
}
