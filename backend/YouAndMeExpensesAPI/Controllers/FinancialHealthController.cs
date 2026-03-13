using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/financial-health")]
    [Authorize]
    public class FinancialHealthController : BaseApiController
    {
        private readonly IFinancialHealthService _service;
        private readonly ILogger<FinancialHealthController> _logger;

        public FinancialHealthController(IFinancialHealthService service, ILogger<FinancialHealthController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetScore()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;
            try
            {
                var score = await _service.GetCurrentScoreAsync(userId.ToString());
                if (score == null)
                    score = await _service.CalculateScoreAsync(userId.ToString());
                return Ok(score);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting financial health score");
                return StatusCode(500, new { error = "Failed to get score" });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int months = 6)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;
            try
            {
                var history = await _service.GetScoreHistoryAsync(userId.ToString(), months);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting score history");
                return StatusCode(500, new { error = "Failed to get score history" });
            }
        }

        [HttpGet("partnership")]
        public async Task<IActionResult> GetPartnershipScore()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;
            try
            {
                var result = await _service.GetPartnershipScoreAsync(userId.ToString());
                if (result == null) return NotFound(new { error = "No partnership found" });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partnership score");
                return StatusCode(500, new { error = "Failed to get partnership score" });
            }
        }

        [HttpPost("recalculate")]
        public async Task<IActionResult> Recalculate()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;
            try
            {
                var score = await _service.CalculateScoreAsync(userId.ToString());
                return Ok(score);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recalculating score");
                return StatusCode(500, new { error = "Failed to recalculate score" });
            }
        }
    }
}
