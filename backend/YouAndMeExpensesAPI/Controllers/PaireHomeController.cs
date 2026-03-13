using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/paire-home")]
    [Authorize]
    public class PaireHomeController : BaseApiController
    {
        private readonly IPaireHomeService _paireHomeService;
        private readonly ILogger<PaireHomeController> _logger;

        public PaireHomeController(IPaireHomeService paireHomeService, ILogger<PaireHomeController> logger)
        {
            _paireHomeService = paireHomeService;
            _logger = logger;
        }

        /// <summary>
        /// Gets the Paire Home state for the authenticated user (creates default if none exists).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHome()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var home = await _paireHomeService.GetOrCreateHomeAsync(userId.ToString());
                return Ok(home);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Paire Home for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve Paire Home" });
            }
        }

        /// <summary>
        /// Gets the detailed room list with levels, points, and unlock status.
        /// </summary>
        [HttpGet("rooms")]
        public async Task<IActionResult> GetRooms()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var rooms = await _paireHomeService.GetRoomsAsync(userId.ToString());
                return Ok(rooms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting rooms for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve rooms" });
            }
        }

        /// <summary>
        /// Manually upgrades a room when points threshold is met.
        /// </summary>
        [HttpPost("upgrade/{room}")]
        public async Task<IActionResult> UpgradeRoom(string room)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrWhiteSpace(room))
                return BadRequest(new { error = "Room name is required" });

            try
            {
                var home = await _paireHomeService.UpgradeRoomAsync(userId.ToString(), room);
                return Ok(home);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upgrading room {Room} for user {UserId}", room, userId);
                return StatusCode(500, new { error = "Failed to upgrade room" });
            }
        }
    }
}
