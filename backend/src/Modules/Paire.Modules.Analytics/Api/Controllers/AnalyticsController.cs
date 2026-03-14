using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Analytics.Api.Controllers;

[Route("api/[controller]")]
public class AnalyticsController : BaseApiController
{
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IAnalyticsService analyticsService, ILogger<AnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    private static DateTime ToUtc(DateTime value) => value.Kind == DateTimeKind.Utc ? value : value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static (DateTime Start, DateTime End) ClampDateRange(DateTime start, DateTime end, int maxDays)
    {
        if (end < start) (start, end) = (end, start);
        var maxSpan = TimeSpan.FromDays(maxDays - 1);
        if (end - start > maxSpan) start = end - maxSpan;
        return (start, end);
    }

    [HttpGet("financial")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetFinancialAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
            var end = ToUtc(endDate ?? DateTime.UtcNow);
            (start, end) = ClampDateRange(start, end, 366);
            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId.ToString(), start, end);
            return Ok(analytics);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting financial analytics"); return StatusCode(500, new { message = "Error retrieving financial analytics", error = ex.Message }); }
    }

    [HttpGet("financial-month")]
    [ResponseCache(Duration = 180)]
    public async Task<IActionResult> GetFinancialMonthSummary([FromQuery] int? year = null, [FromQuery] int? month = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var now = DateTime.UtcNow;
            var summary = await _analyticsService.GetFinancialMonthSummaryAsync(userId.ToString(), year ?? now.Year, month ?? now.Month);
            return Ok(summary);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting financial-month summary"); return StatusCode(500, new { message = "Error retrieving financial-month analytics", error = ex.Message }); }
    }

    [HttpGet("loans")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetLoanAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var start = startDate.HasValue ? ToUtc(startDate.Value) : (DateTime?)null;
            var end = endDate.HasValue ? ToUtc(endDate.Value) : (DateTime?)null;
            var analytics = await _analyticsService.GetLoanAnalyticsAsync(userId.ToString(), start, end);
            return Ok(analytics);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting loan analytics"); return StatusCode(500, new { message = "Error retrieving loan analytics", error = ex.Message }); }
    }

    [HttpGet("household")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetHouseholdAnalytics()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _analyticsService.GetHouseholdAnalyticsAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting household analytics"); return StatusCode(500, new { message = "Error retrieving household analytics", error = ex.Message }); }
    }

    [HttpGet("comparative")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetComparativeAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
            var end = ToUtc(endDate ?? DateTime.UtcNow);
            (start, end) = ClampDateRange(start, end, 366);
            var analytics = await _analyticsService.GetComparativeAnalyticsAsync(userId.ToString(), start, end);
            return Ok(analytics);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting comparative analytics"); return StatusCode(500, new { message = "Error retrieving comparative analytics", error = ex.Message }); }
    }

    [HttpGet("dashboard")]
    [ResponseCache(Duration = 180)]
    public async Task<IActionResult> GetDashboardAnalytics()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _analyticsService.GetDashboardAnalyticsAsync(userId.ToString())); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting dashboard analytics"); return StatusCode(500, new { message = "Error retrieving dashboard analytics", error = ex.Message }); }
    }

    [HttpGet("all")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetAllAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
            var end = ToUtc(endDate ?? DateTime.UtcNow);
            (start, end) = ClampDateRange(start, end, 366);
            var financial = await _analyticsService.GetFinancialAnalyticsAsync(userId.ToString(), start, end);
            var loans = await _analyticsService.GetLoanAnalyticsAsync(userId.ToString(), start, end);
            var household = await _analyticsService.GetHouseholdAnalyticsAsync(userId.ToString());
            var comparative = await _analyticsService.GetComparativeAnalyticsAsync(userId.ToString(), start, end);
            return Ok(new { financial, loans, household, comparative, dateRange = new { start, end } });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting all analytics"); return StatusCode(500, new { message = "Error retrieving analytics", error = ex.Message }); }
    }
}
