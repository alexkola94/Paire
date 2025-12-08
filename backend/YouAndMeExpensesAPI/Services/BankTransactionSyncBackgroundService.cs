using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Background service that automatically syncs bank transactions periodically
    /// Runs daily to import new transactions from connected bank accounts
    /// </summary>
    public class BankTransactionSyncBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BankTransactionSyncBackgroundService> _logger;
        private readonly TimeSpan _syncInterval = TimeSpan.FromHours(6); // Sync every 6 hours

        public BankTransactionSyncBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<BankTransactionSyncBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Bank Transaction Sync Background Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncAllUsersTransactionsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in bank transaction sync background service");
                }

                // Wait for the next sync interval
                await Task.Delay(_syncInterval, stoppingToken);
            }

            _logger.LogInformation("Bank Transaction Sync Background Service stopped");
        }

        /// <summary>
        /// Syncs transactions for all users with active bank connections
        /// </summary>
        private async Task SyncAllUsersTransactionsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var importService = scope.ServiceProvider.GetRequiredService<IBankTransactionImportService>();

            try
            {
                // Get all active bank connections
                var activeConnections = await context.Set<BankConnection>()
                    .Where(bc => bc.IsActive)
                    .Select(bc => bc.UserId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                if (!activeConnections.Any())
                {
                    _logger.LogDebug("No active bank connections found for sync");
                    return;
                }

                _logger.LogInformation($"Starting sync for {activeConnections.Count} users");

                int successCount = 0;
                int errorCount = 0;

                foreach (var userId in activeConnections)
                {
                    try
                    {
                        // Get last sync time for this user
                        var connection = await context.Set<BankConnection>()
                            .FirstOrDefaultAsync(bc => bc.UserId == userId && bc.IsActive, cancellationToken);

                        if (connection == null)
                            continue;

                        // Sync transactions from last sync time (or last 7 days if never synced)
                        var fromDate = connection.LastSyncAt?.AddDays(-1) ?? DateTime.UtcNow.AddDays(-7);
                        var toDate = DateTime.UtcNow;

                        var result = await importService.ImportTransactionsAsync(
                            userId,
                            fromDate,
                            toDate,
                            cancellationToken);

                        if (result.TotalImported > 0)
                        {
                            _logger.LogInformation(
                                $"User {userId}: Imported {result.TotalImported} transactions, " +
                                $"skipped {result.DuplicatesSkipped} duplicates");
                        }

                        successCount++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error syncing transactions for user {userId}");
                        errorCount++;
                    }

                    // Small delay between users to avoid overwhelming the API
                    await Task.Delay(1000, cancellationToken);
                }

                _logger.LogInformation(
                    $"Sync completed: {successCount} successful, {errorCount} errors");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SyncAllUsersTransactionsAsync");
            }
        }
    }
}

