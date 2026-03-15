using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Analytics.Api.Controllers;

[Route("api/year-review")]
public class YearReviewController : BaseApiController
{
    private readonly IYearInReviewService _yearInReviewService;
    private readonly ILogger<YearReviewController> _logger;

    public YearReviewController(IYearInReviewService yearInReviewService, ILogger<YearReviewController> logger)
    {
        _yearInReviewService = yearInReviewService;
        _logger = logger;
    }

    [HttpGet("{year:int}")]
    public async Task<IActionResult> Get(int year)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (year < 2000 || year > 2100)
            return BadRequest(new { error = "Invalid year" });

        try
        {
            var data = await _yearInReviewService.GetYearReviewAsync(userId.ToString(), year);
            if (data == null)
                return NotFound(new { error = "No data available for this year" });

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting year review for user {UserId} year {Year}", userId, year);
            return StatusCode(500, new { error = "Failed to retrieve year review" });
        }
    }
}
