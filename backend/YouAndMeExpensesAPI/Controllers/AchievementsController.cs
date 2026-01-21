using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing achievements
    /// Handles achievement tracking, progress, and notifications
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AchievementsController : BaseApiController
    {
        private readonly IAchievementService _achievementService;
        private readonly ILogger<AchievementsController> _logger;

        public AchievementsController(
            IAchievementService achievementService,
            ILogger<AchievementsController> logger)
        {
            _achievementService = achievementService;
            _logger = logger;
        }

        /// <summary>
        /// Get all achievements with progress for the current user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAchievements()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var progress = await _achievementService.GetUserAchievementProgressAsync(userId.ToString());
                return Ok(progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting achievements for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve achievements" });
            }
        }

        /// <summary>
        /// Get unlocked achievements for the current user
        /// </summary>
        [HttpGet("unlocked")]
        public async Task<IActionResult> GetUnlockedAchievements()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var achievements = await _achievementService.GetUserAchievementsAsync(userId.ToString());
                return Ok(achievements);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unlocked achievements for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve unlocked achievements" });
            }
        }

        /// <summary>
        /// Get newly unlocked achievements that haven't been notified yet
        /// </summary>
        [HttpGet("unnotified")]
        public async Task<IActionResult> GetUnnotifiedAchievements()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var achievements = await _achievementService.GetUnnotifiedAchievementsAsync(userId.ToString());
                return Ok(achievements);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unnotified achievements for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve unnotified achievements" });
            }
        }

        /// <summary>
        /// Mark achievements as notified (user has seen them)
        /// </summary>
        [HttpPost("mark-notified")]
        public async Task<IActionResult> MarkAchievementsAsNotified([FromBody] List<Guid> userAchievementIds)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                await _achievementService.MarkAchievementsAsNotifiedAsync(userAchievementIds);
                return Ok(new { message = "Achievements marked as notified" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking achievements as notified for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to mark achievements as notified" });
            }
        }

        /// <summary>
        /// Check and award new achievements for the current user
        /// This is typically called after significant actions (creating transaction, budget, etc.)
        /// </summary>
        [HttpPost("check")]
        public async Task<IActionResult> CheckAchievements()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var newAchievements = await _achievementService.CheckAllAchievementsAsync(userId.ToString());
                return Ok(new
                {
                    newAchievements = newAchievements.Count,
                    achievements = newAchievements
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking achievements for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to check achievements" });
            }
        }

        /// <summary>
        /// Get achievement statistics for the current user
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetAchievementStats()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var stats = await _achievementService.GetAchievementStatsAsync(userId.ToString());
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting achievement stats for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve achievement statistics" });
            }
        }
    }
}

