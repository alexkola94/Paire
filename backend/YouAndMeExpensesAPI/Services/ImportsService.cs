using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for working with import history records and reverting imports.
    /// </summary>
    public class ImportsService : IImportsService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ImportsService> _logger;

        public ImportsService(AppDbContext dbContext, ILogger<ImportsService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<IReadOnlyList<ImportHistory>> GetImportHistoryAsync(string userId)
        {
            return await _dbContext.ImportHistories
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.ImportDate)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<(bool found, string? errorMessage)> RevertImportAsync(string userId, Guid importId)
        {
            var import = await _dbContext.ImportHistories
                .Include(h => h.Transactions)
                .FirstOrDefaultAsync(h => h.Id == importId && h.UserId == userId);

            if (import == null)
            {
                return (false, null);
            }

            try
            {
                if (import.Transactions != null && import.Transactions.Any())
                {
                    _dbContext.Transactions.RemoveRange(import.Transactions);
                }

                _dbContext.ImportHistories.Remove(import);

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Reverted import {ImportId} for user {UserId}", importId, userId);

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reverting import {ImportId}", importId);
                return (true, "An error occurred while reverting the import.");
            }
        }
    }
}

