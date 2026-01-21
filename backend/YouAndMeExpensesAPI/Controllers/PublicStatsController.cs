using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Public statistics controller - no authentication required
    /// Provides aggregated platform statistics for the landing page
    /// </summary>
    [ApiController]
    [Route("api/public")]
    public class PublicStatsController : ControllerBase
    {
        private readonly IPublicStatsService _publicStatsService;
        private readonly ILogger<PublicStatsController> _logger;

        public PublicStatsController(
            IPublicStatsService publicStatsService,
            ILogger<PublicStatsController> logger)
        {
            _publicStatsService = publicStatsService;
            _logger = logger;
        }

        /// <summary>
        /// Get public platform statistics for the landing page
        /// </summary>
        /// <returns>Aggregated platform statistics</returns>
        [HttpGet("stats")]
        public async Task<IActionResult> GetPublicStats()
        {
            try
            {
                var stats = await _publicStatsService.GetPublicStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching public statistics");
                
                // Service already returns safe defaults on error; mirror original behavior
                return Ok(new PublicStatsDto
                {
                    TotalUsers = 0,
                    TotalTransactions = 0,
                    TotalMoneySaved = 0,
                    FormattedUsers = "0",
                    FormattedTransactions = "0",
                    FormattedMoneySaved = "€0"
                });
            }
        }
    }
}
