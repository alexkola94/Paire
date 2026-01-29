using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for public platform statistics used on the landing page.
    /// Encapsulates all database reads and formatting logic.
    /// SECURITY: Uses obfuscated values to prevent exact platform size disclosure.
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

                // SECURITY FIX: Use obfuscated values to prevent exact count disclosure
                var stats = new PublicStatsDto
                {
                    // Return obfuscated counts - never exact numbers for small platforms
                    TotalUsers = ObfuscateCount(totalUsers),
                    TotalTransactions = ObfuscateCount(totalTransactions),
                    TotalMoneySaved = ObfuscateCurrency(totalSaved),
                    FormattedUsers = FormatUserCount(totalUsers),
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
                    FormattedUsers = "Growing community",
                    FormattedTransactions = "0",
                    FormattedMoneySaved = "€0"
                };
            }
        }

        /// <summary>
        /// SECURITY: Obfuscates user counts to prevent exact platform size disclosure.
        /// Small counts show "Growing community", larger counts show rounded ranges.
        /// </summary>
        private static string FormatUserCount(long count)
        {
            // For small user bases, don't reveal exact count
            if (count < 50) return "Growing community";
            if (count < 100) return "50+";
            if (count < 500) return $"{(count / 100) * 100}+"; // "100+", "200+", etc.
            if (count < 1000) return $"{(count / 100) * 100}+"; // "500+", "600+", etc.
            if (count >= 1_000_000)
                return $"{count / 1_000_000.0:0.#}M+";
            if (count >= 1_000)
                return $"{count / 1_000.0:0.#}K+";
            return $"{count}+";
        }

        /// <summary>
        /// SECURITY: Obfuscates numeric counts for API response.
        /// Returns rounded values to prevent exact enumeration.
        /// </summary>
        private static long ObfuscateCount(long count)
        {
            // Round down to nearest significant figure to prevent exact counts
            if (count < 50) return 0; // Don't reveal small exact counts
            if (count < 100) return 50;
            if (count < 1000) return (count / 100) * 100; // Round to nearest 100
            if (count < 10000) return (count / 1000) * 1000; // Round to nearest 1000
            return (count / 10000) * 10000; // Round to nearest 10000
        }

        /// <summary>
        /// SECURITY: Obfuscates currency amounts for API response.
        /// </summary>
        private static decimal ObfuscateCurrency(decimal amount)
        {
            if (amount < 100) return 0;
            if (amount < 1000) return Math.Floor(amount / 100) * 100;
            if (amount < 10000) return Math.Floor(amount / 1000) * 1000;
            return Math.Floor(amount / 10000) * 10000;
        }

        private static string FormatNumber(long number)
        {
            if (number >= 1_000_000)
                return $"{number / 1_000_000.0:0.#}M+";
            if (number >= 1_000)
                return $"{number / 1_000.0:0.#}K+";
            if (number < 50) return "Building momentum";
            return $"{number}+";
        }

        private static string FormatCurrency(decimal amount)
        {
            if (amount >= 1_000_000)
                return $"€{amount / 1_000_000:0.#}M+";
            if (amount >= 1_000)
                return $"€{amount / 1_000:0.#}K+";
            if (amount < 100) return "€0";
            return $"€{Math.Floor(amount / 100) * 100:N0}+";
        }
    }
}

