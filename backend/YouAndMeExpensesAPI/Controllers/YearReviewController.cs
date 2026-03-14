using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/year-review")]
    [Authorize]
    public class YearReviewController : BaseApiController
    {
        private readonly IYearInReviewService _yearReviewService;
        private readonly ILogger<YearReviewController> _logger;

        public YearReviewController(IYearInReviewService yearReviewService, ILogger<YearReviewController> logger)
        {
            _yearReviewService = yearReviewService;
            _logger = logger;
        }

        [HttpGet("{year}")]
        public async Task<IActionResult> GetYearReview(int year)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (year < 2000 || year > DateTime.UtcNow.Year)
                return BadRequest(new { error = "Invalid year" });

            try
            {
                var review = await _yearReviewService.GetYearReviewAsync(userId.ToString(), year);
                return Ok(review);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting year review for user {UserId}, year {Year}", userId, year);
                return StatusCode(500, new { error = "Failed to generate year review" });
            }
        }

        [HttpPost("{year}/regenerate")]
        public async Task<IActionResult> RegenerateYearReview(int year)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (year < 2000 || year > DateTime.UtcNow.Year)
                return BadRequest(new { error = "Invalid year" });

            try
            {
                var review = await _yearReviewService.RegenerateYearReviewAsync(userId.ToString(), year);
                return Ok(review);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error regenerating year review for user {UserId}, year {Year}", userId, year);
                return StatusCode(500, new { error = "Failed to regenerate year review" });
            }
        }
    }
}
