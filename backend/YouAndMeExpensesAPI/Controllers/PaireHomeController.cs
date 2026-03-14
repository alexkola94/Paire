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

        [HttpGet("furniture")]
        public async Task<IActionResult> GetFurniture()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var furniture = await _paireHomeService.GetFurnitureAsync(userId.ToString());
                return Ok(furniture);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting furniture for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve furniture" });
            }
        }

        [HttpPost("furniture/equip")]
        public async Task<IActionResult> EquipFurniture([FromBody] EquipFurnitureRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var result = await _paireHomeService.EquipFurnitureAsync(userId.ToString(), request.Room, request.FurnitureCode, request.Equip);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error equipping furniture for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to equip furniture" });
            }
        }

        [HttpPost("theme")]
        public async Task<IActionResult> SetSeasonalTheme([FromBody] SetThemeRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var home = await _paireHomeService.SetSeasonalThemeAsync(userId.ToString(), request.Theme);
                return Ok(home);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting theme for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to set theme" });
            }
        }

        [HttpGet("couple")]
        public async Task<IActionResult> GetCoupleHome()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var coupleHome = await _paireHomeService.GetCoupleHomeAsync(userId.ToString());
                return Ok(coupleHome);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting couple home for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve couple home" });
            }
        }
    }

    public class EquipFurnitureRequest
    {
        public string Room { get; set; } = string.Empty;
        public string FurnitureCode { get; set; } = string.Empty;
        public bool Equip { get; set; } = true;
    }

    public class SetThemeRequest
    {
        public string Theme { get; set; } = "default";
    }
}
