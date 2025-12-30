using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpenses.Controllers
{
    /// <summary>
    /// Public statistics controller - no authentication required
    /// Provides aggregated platform statistics for the landing page
    /// </summary>
    [ApiController]
    [Route("api/public")]
    public class PublicStatsController : ControllerBase
    {
        private readonly ILogger<PublicStatsController> _logger;
        private readonly AppDbContext _context;

        public PublicStatsController(ILogger<PublicStatsController> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
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
                _logger.LogInformation("Fetching public platform statistics");

                // Get total verified users count
                var totalUsers = await _context.Users
                    .Where(u => u.EmailConfirmed)
                    .CountAsync();

                // Get total transactions count
                var totalTransactions = await _context.Transactions.CountAsync();

                // Get total money saved (sum of all savings goals current amounts)
                var totalSaved = await _context.SavingsGoals
                    .SumAsync(g => g.CurrentAmount);

                // Format the statistics for display
                var stats = new PublicStatsDto
                {
                    TotalUsers = totalUsers,
                    TotalTransactions = totalTransactions,
                    TotalMoneySaved = totalSaved,
                    // Formatted versions for display
                    FormattedUsers = FormatNumber(totalUsers),
                    FormattedTransactions = FormatNumber(totalTransactions),
                    FormattedMoneySaved = FormatCurrency(totalSaved)
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching public statistics");
                
                // Return default values on error so the landing page still works
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

        /// <summary>
        /// Format a number with K/M suffix for thousands/millions
        /// </summary>
        private static string FormatNumber(long number)
        {
            if (number >= 1_000_000)
                return $"{number / 1_000_000.0:0.#}M+";
            if (number >= 1_000)
                return $"{number / 1_000.0:0.#}K+";
            return number.ToString();
        }

        /// <summary>
        /// Format a currency amount with K/M suffix
        /// </summary>
        private static string FormatCurrency(decimal amount)
        {
            if (amount >= 1_000_000)
                return $"€{amount / 1_000_000:0.#}M+";
            if (amount >= 1_000)
                return $"€{amount / 1_000:0.#}K+";
            return $"€{amount:N0}";
        }
    }

    /// <summary>
    /// DTO for public statistics response
    /// </summary>
    public class PublicStatsDto
    {
        /// <summary>Raw user count</summary>
        public long TotalUsers { get; set; }

        /// <summary>Raw transaction count</summary>
        public long TotalTransactions { get; set; }

        /// <summary>Raw total money saved</summary>
        public decimal TotalMoneySaved { get; set; }

        /// <summary>Formatted user count (e.g., "10K+")</summary>
        public string FormattedUsers { get; set; } = string.Empty;

        /// <summary>Formatted transaction count (e.g., "500K+")</summary>
        public string FormattedTransactions { get; set; } = string.Empty;

        /// <summary>Formatted money saved (e.g., "€2M+")</summary>
        public string FormattedMoneySaved { get; set; } = string.Empty;
    }
}
