using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Paire.Modules.Notifications.Core.Interfaces;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Modules.Notifications.Core.Background;

public class ReminderBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReminderBackgroundService> _logger;
    private readonly IJobMonitorService _jobMonitor;
    private static readonly TimeSpan TargetTime = new(9, 0, 0); // 9:00 AM

    public ReminderBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<ReminderBackgroundService> logger,
        IJobMonitorService jobMonitor)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _jobMonitor = jobMonitor;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Reminder Background Service started");
        _jobMonitor.ReportStart("ReminderService");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.Now;
                var nextRun = now.Date.Add(TargetTime);
                if (now > nextRun) nextRun = nextRun.AddDays(1);

                var delay = nextRun - now;
                _logger.LogInformation("Next reminder check scheduled for {NextRun} (in {Hours:F1} hours)", nextRun, delay.TotalHours);
                _jobMonitor.ReportSuccess("ReminderService", $"Waiting until {nextRun}");

                await Task.Delay(delay, stoppingToken);

                _jobMonitor.ReportStart("ReminderService");
                await CheckAndSendRemindersAsync();

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Reminder Background Service is stopping");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Reminder Background Service");
                _jobMonitor.ReportFailure("ReminderService", ex);
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        _logger.LogInformation("Reminder Background Service stopped");
    }

    private async Task CheckAndSendRemindersAsync()
    {
        _logger.LogInformation("Starting daily reminder check for all users");
        using var scope = _serviceProvider.CreateScope();
        var reminderService = scope.ServiceProvider.GetRequiredService<IReminderService>();
        var totalSent = await reminderService.CheckAndSendAllUsersRemindersAsync();
        _logger.LogInformation("Daily reminder check completed. Sent {Total} total reminders.", totalSent);
        _jobMonitor.ReportSuccess("ReminderService", $"Completed. Sent {totalSent} reminders.");
    }
}
