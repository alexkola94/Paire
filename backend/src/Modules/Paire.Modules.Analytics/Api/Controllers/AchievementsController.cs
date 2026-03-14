using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Analytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AchievementsController : BaseApiController
{
    private readonly IAchievementService _achievementService;
    private readonly ILogger<AchievementsController> _logger;

    public AchievementsController(IAchievementService achievementService, ILogger<AchievementsController> logger)
    {
        _achievementService = achievementService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAchievements()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _achievementService.GetUserAchievementProgressAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting achievements"); return StatusCode(500, new { error = "Failed to retrieve achievements" }); }
    }

    [HttpGet("unlocked")]
    public async Task<IActionResult> GetUnlockedAchievements()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _achievementService.GetUserAchievementsAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting unlocked achievements"); return StatusCode(500, new { error = "Failed to retrieve unlocked achievements" }); }
    }

    [HttpGet("unnotified")]
    public async Task<IActionResult> GetUnnotifiedAchievements()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _achievementService.GetUnnotifiedAchievementsAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting unnotified achievements"); return StatusCode(500, new { error = "Failed to retrieve unnotified achievements" }); }
    }

    [HttpPost("mark-notified")]
    public async Task<IActionResult> MarkAchievementsAsNotified([FromBody] List<Guid> userAchievementIds)
    {
        var (_, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { await _achievementService.MarkAchievementsAsNotifiedAsync(userAchievementIds); return Ok(new { message = "Achievements marked as notified" }); }
        catch (Exception ex) { _logger.LogError(ex, "Error marking achievements as notified"); return StatusCode(500, new { error = "Failed to mark achievements as notified" }); }
    }

    [HttpPost("check")]
    public async Task<IActionResult> CheckAchievements()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var newAchievements = await _achievementService.CheckAllAchievementsAsync(userId.ToString());
            return Ok(new { newAchievements = newAchievements.Count, achievements = newAchievements });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error checking achievements"); return StatusCode(500, new { error = "Failed to check achievements" }); }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetAchievementStats()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _achievementService.GetAchievementStatsAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting achievement stats"); return StatusCode(500, new { error = "Failed to retrieve achievement statistics" }); }
    }
}
