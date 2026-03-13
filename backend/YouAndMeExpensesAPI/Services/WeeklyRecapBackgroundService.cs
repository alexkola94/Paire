using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Background service that runs weekly on Mondays at 7:00 UTC
    /// to generate weekly financial recaps for all users with transactions.
    /// </summary>
    public class WeeklyRecapBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<WeeklyRecapBackgroundService> _logger;

        private static readonly TimeSpan TargetTime = new(7, 0, 0); // 7:00 UTC

        public WeeklyRecapBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<WeeklyRecapBackgroundService> logger)
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

                    _logger.LogInformation("Next weekly recap run scheduled for {NextRun} UTC (in {Hours:F1} hours)", nextMonday, delay.TotalHours);

                    await Task.Delay(delay, stoppingToken);

                    // Generate recaps for the week that just ended (previous Monday to Sunday)
                    var previousWeekStart = GetPreviousWeekMonday(DateTime.UtcNow);
                    await GenerateRecapsForAllUsersAsync(previousWeekStart, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Weekly Recap Background Service is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Weekly Recap Background Service");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }

            _logger.LogInformation("Weekly Recap Background Service stopped");
        }

        private static DateTime GetNextMonday7Utc(DateTime now)
        {
            var nextMonday = now.Date;
            var daysUntilMonday = ((int)DayOfWeek.Monday - (int)now.DayOfWeek + 7) % 7;

            if (daysUntilMonday == 0 && now.TimeOfDay >= TargetTime)
                daysUntilMonday = 7;

            nextMonday = nextMonday.AddDays(daysUntilMonday).Add(TargetTime);
            return nextMonday;
        }

        private static DateTime GetPreviousWeekMonday(DateTime now)
        {
            var daysFromMonday = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return now.Date.AddDays(-daysFromMonday - 7);
        }

        private async Task GenerateRecapsForAllUsersAsync(DateTime weekStart, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var recapService = scope.ServiceProvider.GetRequiredService<IWeeklyRecapService>();

            var userIds = await context.Transactions
                .Select(t => t.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Generating weekly recaps for {Count} users", userIds.Count);

            var successCount = 0;
            foreach (var userId in userIds)
            {
                try
                {
                    await recapService.GenerateRecapAsync(userId, weekStart);
                    successCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to generate recap for user {UserId}", userId);
                }
            }

            _logger.LogInformation("Weekly recap generation completed. Success: {Success}/{Total}", successCount, userIds.Count);
        }
    }
}
