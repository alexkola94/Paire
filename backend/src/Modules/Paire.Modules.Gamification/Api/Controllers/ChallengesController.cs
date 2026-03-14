using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Gamification.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Gamification.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChallengesController : BaseApiController
{
    private readonly IChallengeService _challengeService;
    private readonly ILogger<ChallengesController> _logger;

    public ChallengesController(IChallengeService challengeService, ILogger<ChallengesController> logger)
    {
        _challengeService = challengeService;
        _logger = logger;
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableChallenges()
    {
        try { return Ok(await _challengeService.GetAvailableChallengesAsync()); }
        catch (Exception ex) { _logger.LogError(ex, "Error fetching available challenges"); return StatusCode(500, new { error = "Failed to retrieve challenges" }); }
    }

    [HttpGet]
    public async Task<IActionResult> GetUserChallenges([FromQuery] string? status = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _challengeService.GetUserChallengesAsync(userId.ToString(), status)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting challenges for user {UserId}", userId); return StatusCode(500, new { error = "Failed to retrieve user challenges" }); }
    }

    [HttpPost("{challengeId}/join")]
    public async Task<IActionResult> JoinChallenge(Guid challengeId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _challengeService.JoinChallengeAsync(userId.ToString(), challengeId)); }
        catch (InvalidOperationException ex) { return NotFound(new { error = ex.Message }); }
        catch (Exception ex) { _logger.LogError(ex, "Error joining challenge {ChallengeId} for user {UserId}", challengeId, userId); return StatusCode(500, new { error = "Failed to join challenge" }); }
    }

    [HttpPost("{userChallengeId}/progress")]
    public async Task<IActionResult> UpdateProgress(Guid userChallengeId, [FromBody] UpdateProgressRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var result = await _challengeService.UpdateProgressAsync(userId.ToString(), userChallengeId, request.IncrementBy);
            if (result == null) return NotFound(new { error = "Active challenge not found" });
            return Ok(result);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error updating challenge progress for user {UserId}", userId); return StatusCode(500, new { error = "Failed to update progress" }); }
    }

    [HttpPost("{userChallengeId}/claim")]
    public async Task<IActionResult> ClaimReward(Guid userChallengeId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var result = await _challengeService.ClaimRewardAsync(userId.ToString(), userChallengeId);
            if (result == null) return NotFound(new { error = "Completed challenge not found or reward already claimed" });
            return Ok(result);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error claiming reward for user {UserId}", userId); return StatusCode(500, new { error = "Failed to claim reward" }); }
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedChallenges()
    {
        try { await _challengeService.SeedDefaultChallengesAsync(); return Ok(new { message = "Challenges seeded successfully" }); }
        catch (Exception ex) { _logger.LogError(ex, "Error seeding challenges"); return StatusCode(500, new { error = "Failed to seed challenges" }); }
    }
}

public class UpdateProgressRequest { public decimal IncrementBy { get; set; } = 1; }
