using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// System controller for health checks and system information
    /// </summary>
    [ApiController]
    [Route("api/system")]
    public class SystemController : ControllerBase
    {
        private readonly ISystemService _systemService;
        private readonly ILogger<SystemController> _logger;

        public SystemController(
            ISystemService systemService,
            ILogger<SystemController> logger)
        {
            _systemService = systemService;
            _logger = logger;
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        /// <returns>System health status</returns>
        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            var result = await _systemService.GetHealthAsync();
            return Ok(result);
        }

        /// <summary>
        /// API information endpoint
        /// </summary>
        /// <returns>API information</returns>
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
        /// Gets the changelog content
        /// </summary>
        /// <returns>Markdown content of CHANGELOG.md</returns>
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
        /// Clears all data from the database (keeps table structure)
        /// WARNING: This is irreversible! Use only in development.
        /// </summary>
        /// <returns>Success message</returns>
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
        /// Runs a diagnostic test for SMTP connectivity
        /// </summary>
        [HttpGet("diagnostics/email")]
        public async Task<IActionResult> TestSmtpConnectivity()
        {
            var result = await _systemService.TestSmtpConnectivityAsync();

            // If service already wraps error state, just return 200 with payload as before
            return Ok(result);
        }
    }
}

