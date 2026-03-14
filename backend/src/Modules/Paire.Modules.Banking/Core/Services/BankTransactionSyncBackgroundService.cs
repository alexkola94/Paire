using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using Paire.Modules.Banking.Core.Entities;
using Paire.Modules.Banking.Infrastructure;
using Paire.Modules.Finance.Core.Interfaces;

namespace Paire.Modules.Banking.Core.Services;

public class BankTransactionSyncBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BankTransactionSyncBackgroundService> _logger;
    private readonly TimeSpan _syncInterval = TimeSpan.FromHours(6);

    public BankTransactionSyncBackgroundService(IServiceProvider serviceProvider, ILogger<BankTransactionSyncBackgroundService> logger)
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
            await Task.Delay(_syncInterval, stoppingToken);
        }

        _logger.LogInformation("Bank Transaction Sync Background Service stopped");
    }

    private async Task SyncAllUsersTransactionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var bankingContext = scope.ServiceProvider.GetRequiredService<BankingDbContext>();
        var importService = scope.ServiceProvider.GetRequiredService<IBankTransactionImportService>();

        try
        {
            var activeConnections = await bankingContext.BankConnections
                .Where(bc => bc.IsActive)
                .Select(bc => bc.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (!activeConnections.Any()) { _logger.LogDebug("No active bank connections found for sync"); return; }

            _logger.LogInformation("Starting sync for {Count} users", activeConnections.Count);
            int successCount = 0, errorCount = 0;

            foreach (var userId in activeConnections)
            {
                try
                {
                    var connection = await bankingContext.BankConnections
                        .FirstOrDefaultAsync(bc => bc.UserId == userId && bc.IsActive, cancellationToken);
                    if (connection == null) continue;

                    var fromDate = connection.LastSyncAt?.AddDays(-1) ?? DateTime.UtcNow.AddDays(-7);
                    var toDate = DateTime.UtcNow;

                    var result = await importService.ImportTransactionsAsync(userId, fromDate, toDate, cancellationToken);

                    if (result.TotalImported > 0)
                        _logger.LogInformation("User {UserId}: Imported {Total} transactions, skipped {Duplicates} duplicates", userId, result.TotalImported, result.DuplicatesSkipped);

                    successCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing transactions for user {UserId}", userId);
                    errorCount++;
                }
                await Task.Delay(1000, cancellationToken);
            }

            _logger.LogInformation("Sync completed: {Success} successful, {Errors} errors", successCount, errorCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SyncAllUsersTransactionsAsync");
        }
    }
}
