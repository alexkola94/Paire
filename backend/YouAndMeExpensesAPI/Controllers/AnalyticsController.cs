using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Analytics API Controller
    /// Provides comprehensive analytics endpoints for financial insights
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(IAnalyticsService analyticsService, ILogger<AnalyticsController> logger)
        {
            _analyticsService = analyticsService;
            _logger = logger;
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
        public async Task<ActionResult<FinancialAnalyticsDTO>> GetFinancialAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                // Default to current month if no dates provided
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? DateTime.Now;

                var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, start, end);
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
        public async Task<ActionResult<LoanAnalyticsDTO>> GetLoanAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var analytics = await _analyticsService.GetLoanAnalyticsAsync(userId, startDate, endDate);
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
        public async Task<ActionResult<HouseholdAnalyticsDTO>> GetHouseholdAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var analytics = await _analyticsService.GetHouseholdAnalyticsAsync(userId);
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
        public async Task<ActionResult<ComparativeAnalyticsDTO>> GetComparativeAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                // Default to current month
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? DateTime.Now;

                var analytics = await _analyticsService.GetComparativeAnalyticsAsync(userId, start, end);
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
        public async Task<ActionResult<DashboardAnalyticsDTO>> GetDashboardAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var analytics = await _analyticsService.GetDashboardAnalyticsAsync(userId);
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
        public async Task<ActionResult> GetAllAnalytics(
            [FromHeader(Name = "X-User-Id")] string userId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID is required" });
            }

            try
            {
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? DateTime.Now;

                // Fetch all analytics in parallel
                var financialTask = _analyticsService.GetFinancialAnalyticsAsync(userId, start, end);
                var loansTask = _analyticsService.GetLoanAnalyticsAsync(userId, start, end);
                var householdTask = _analyticsService.GetHouseholdAnalyticsAsync(userId);
                var comparativeTask = _analyticsService.GetComparativeAnalyticsAsync(userId, start, end);

                await Task.WhenAll(financialTask, loansTask, householdTask, comparativeTask);

                return Ok(new
                {
                    financial = await financialTask,
                    loans = await loansTask,
                    household = await householdTask,
                    comparative = await comparativeTask,
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

