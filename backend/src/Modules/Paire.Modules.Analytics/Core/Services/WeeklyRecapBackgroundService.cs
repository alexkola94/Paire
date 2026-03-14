using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Finance.Infrastructure;

namespace Paire.Modules.Analytics.Core.Services;

public class WeeklyRecapBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WeeklyRecapBackgroundService> _logger;
    private static readonly TimeSpan TargetTime = new(7, 0, 0);

    public WeeklyRecapBackgroundService(IServiceScopeFactory scopeFactory, ILogger<WeeklyRecapBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Weekly Recap Background Service started");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextMonday = GetNextMonday7Utc(now);
                var delay = nextMonday - now;
                _logger.LogInformation("Next weekly recap run scheduled for {NextRun} UTC", nextMonday);
                await Task.Delay(delay, stoppingToken);

                var previousWeekStart = GetPreviousWeekMonday(DateTime.UtcNow);
                await GenerateRecapsForAllUsersAsync(previousWeekStart, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Error in Weekly Recap Background Service"); await Task.Delay(TimeSpan.FromHours(1), stoppingToken); }
        }
    }

    private static DateTime GetNextMonday7Utc(DateTime now)
    {
        var daysUntilMonday = ((int)DayOfWeek.Monday - (int)now.DayOfWeek + 7) % 7;
        if (daysUntilMonday == 0 && now.TimeOfDay >= TargetTime) daysUntilMonday = 7;
        return now.Date.AddDays(daysUntilMonday).Add(TargetTime);
    }

    private static DateTime GetPreviousWeekMonday(DateTime now)
    {
        var daysFromMonday = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        return now.Date.AddDays(-daysFromMonday - 7);
    }

    private async Task GenerateRecapsForAllUsersAsync(DateTime weekStart, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var financeContext = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        var recapService = scope.ServiceProvider.GetRequiredService<IWeeklyRecapService>();

        var userIds = await financeContext.Transactions.Select(t => t.UserId).Distinct().ToListAsync(cancellationToken);
        _logger.LogInformation("Generating weekly recaps for {Count} users", userIds.Count);
        var successCount = 0;
        foreach (var userId in userIds)
        {
            try { await recapService.GenerateRecapAsync(userId, weekStart); successCount++; }
            catch (Exception ex) { _logger.LogError(ex, "Failed to generate recap for user {UserId}", userId); }
        }
        _logger.LogInformation("Weekly recap generation completed. Success: {Success}/{Total}", successCount, userIds.Count);
    }
}
