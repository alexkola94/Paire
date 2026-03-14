using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Identity.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StreaksController : BaseApiController
    {
        private readonly IStreakService _streakService;
        private readonly ILogger<StreaksController> _logger;

        public StreaksController(IStreakService streakService, ILogger<StreaksController> logger)
        {
            _streakService = streakService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetStreaks()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var streaks = await _streakService.GetStreaksAsync(userId.ToString());
                return Ok(streaks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting streaks for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve streaks" });
            }
        }

        [HttpPost("record")]
        public async Task<IActionResult> RecordActivity([FromBody] RecordStreakRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrWhiteSpace(request?.StreakType))
                return BadRequest(new { error = "StreakType is required" });

            var validTypes = new[] { "expense_logging", "login", "budget_adherence" };
            if (!validTypes.Contains(request.StreakType))
                return BadRequest(new { error = $"Invalid streak type. Must be one of: {string.Join(", ", validTypes)}" });

            try
            {
                var streak = await _streakService.RecordActivityAsync(userId.ToString(), request.StreakType);
                return Ok(streak);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording streak for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to record streak" });
            }
        }
    }

    public class RecordStreakRequest
    {
        public string StreakType { get; set; } = string.Empty;
    }
}
