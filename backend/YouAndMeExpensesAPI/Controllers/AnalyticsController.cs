using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Analytics API Controller
    /// Provides comprehensive analytics endpoints for financial insights
    /// </summary>
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

        /// <summary>
        /// Normalize a date to UTC for PostgreSQL (timestamp with time zone).
        /// EF Core / Npgsql require UTC; Unspecified/Local cause errors.
        /// </summary>
        private static DateTime ToUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        /// <summary>
        /// Get financial analytics for a date range
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <param name="startDate">Start date (ISO format)</param>
        /// <param name="endDate">End date (ISO format)</param>
        /// <returns>Financial analytics data</returns>
        [HttpGet("financial")]
        [ResponseCache(Duration = 300)] // Cache for 5 minutes
        public async Task<IActionResult> GetFinancialAnalytics(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Default to current month if no dates provided (use UTC for PostgreSQL)
                var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
                var end = ToUtc(endDate ?? DateTime.UtcNow);

                var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId.ToString(), start, end);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting financial analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving financial analytics", error = ex.Message });
            }
        }

        /// <summary>
        /// Get loan analytics
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <param name="startDate">Optional start date filter</param>
        /// <param name="endDate">Optional end date filter</param>
        /// <returns>Loan analytics data</returns>
        [HttpGet("loans")]
        [ResponseCache(Duration = 300)]
        public async Task<IActionResult> GetLoanAnalytics(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Normalize to UTC for PostgreSQL
                var start = startDate.HasValue ? ToUtc(startDate.Value) : (DateTime?)null;
                var end = endDate.HasValue ? ToUtc(endDate.Value) : (DateTime?)null;
                var analytics = await _analyticsService.GetLoanAnalyticsAsync(userId.ToString(), start, end);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving loan analytics", error = ex.Message });
            }
        }

        /// <summary>
        /// Get household analytics (budgets, savings, bills)
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <returns>Household analytics data</returns>
        [HttpGet("household")]
        [ResponseCache(Duration = 300)]
        public async Task<IActionResult> GetHouseholdAnalytics()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var analytics = await _analyticsService.GetHouseholdAnalyticsAsync(userId.ToString());
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting household analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving household analytics", error = ex.Message });
            }
        }

        /// <summary>
        /// Get comparative analytics (partner comparison, trends)
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <param name="startDate">Start date (ISO format)</param>
        /// <param name="endDate">End date (ISO format)</param>
        /// <returns>Comparative analytics data</returns>
        [HttpGet("comparative")]
        [ResponseCache(Duration = 300)]
        public async Task<IActionResult> GetComparativeAnalytics(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Default to current month (use UTC for PostgreSQL)
                var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
                var end = ToUtc(endDate ?? DateTime.UtcNow);

                var analytics = await _analyticsService.GetComparativeAnalyticsAsync(userId.ToString(), start, end);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting comparative analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving comparative analytics", error = ex.Message });
            }
        }

        /// <summary>
        /// Get dashboard summary analytics
        /// Optimized for dashboard widgets
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <returns>Dashboard analytics data</returns>
        [HttpGet("dashboard")]
        [ResponseCache(Duration = 180)] // Cache for 3 minutes (more frequent updates)
        public async Task<IActionResult> GetDashboardAnalytics()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var analytics = await _analyticsService.GetDashboardAnalyticsAsync(userId.ToString());
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving dashboard analytics", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all analytics in one request (for initial page load)
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <param name="startDate">Start date (ISO format)</param>
        /// <param name="endDate">End date (ISO format)</param>
        /// <returns>Combined analytics data</returns>
        [HttpGet("all")]
        [ResponseCache(Duration = 300)]
        public async Task<IActionResult> GetAllAnalytics(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var start = ToUtc(startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));
                var end = ToUtc(endDate ?? DateTime.UtcNow);

                // Fetch analytics sequentially — DbContext is not thread-safe; parallel calls share the same instance
                var financial = await _analyticsService.GetFinancialAnalyticsAsync(userId.ToString(), start, end);
                var loans = await _analyticsService.GetLoanAnalyticsAsync(userId.ToString(), start, end);
                var household = await _analyticsService.GetHouseholdAnalyticsAsync(userId.ToString());
                var comparative = await _analyticsService.GetComparativeAnalyticsAsync(userId.ToString(), start, end);

                return Ok(new
                {
                    financial,
                    loans,
                    household,
                    comparative,
                    dateRange = new { start, end }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all analytics for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving analytics", error = ex.Message });
            }
        }
    }
}

