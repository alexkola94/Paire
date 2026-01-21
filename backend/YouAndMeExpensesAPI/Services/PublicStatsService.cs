using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for public platform statistics used on the landing page.
    /// Encapsulates all database reads and formatting logic.
    /// </summary>
    public class PublicStatsService : IPublicStatsService
    {
        private readonly ILogger<PublicStatsService> _logger;
        private readonly AppDbContext _context;

        public PublicStatsService(ILogger<PublicStatsService> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public async Task<PublicStatsDto> GetPublicStatsAsync()
        {
            try
            {
                _logger.LogInformation("Fetching public platform statistics");

                var totalUsers = await _context.Users
                    .Where(u => u.EmailConfirmed)
                    .CountAsync();

                var totalTransactions = await _context.Transactions.CountAsync();

                var totalSaved = await _context.SavingsGoals
                    .SumAsync(g => g.CurrentAmount);

                var stats = new PublicStatsDto
                {
                    TotalUsers = totalUsers,
                    TotalTransactions = totalTransactions,
                    TotalMoneySaved = totalSaved,
                    FormattedUsers = FormatNumber(totalUsers),
                    FormattedTransactions = FormatNumber(totalTransactions),
                    FormattedMoneySaved = FormatCurrency(totalSaved)
                };

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching public statistics");

                return new PublicStatsDto
                {
                    TotalUsers = 0,
                    TotalTransactions = 0,
                    TotalMoneySaved = 0,
                    FormattedUsers = "0",
                    FormattedTransactions = "0",
                    FormattedMoneySaved = "€0"
                };
            }
        }

        private static string FormatNumber(long number)
        {
            if (number >= 1_000_000)
                return $"{number / 1_000_000.0:0.#}M+";
            if (number >= 1_000)
                return $"{number / 1_000.0:0.#}K+";
            return number.ToString();
        }

        private static string FormatCurrency(decimal amount)
        {
            if (amount >= 1_000_000)
                return $"€{amount / 1_000_000:0.#}M+";
            if (amount >= 1_000)
                return $"€{amount / 1_000:0.#}K+";
            return $"€{amount:N0}";
        }
    }
}

