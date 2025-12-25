namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Background service that runs daily to check and send reminders automatically
    /// Runs at 9 AM every day
    /// </summary>
    public class ReminderBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ReminderBackgroundService> _logger;
        private readonly JobMonitorService _jobMonitor; // Injected singleton
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Check once per day
        private readonly TimeSpan _targetTime = new TimeSpan(9, 0, 0); // 9:00 AM

        public ReminderBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<ReminderBackgroundService> logger,
            JobMonitorService jobMonitor)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _jobMonitor = jobMonitor;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Reminder Background Service started");
            _jobMonitor.ReportStart("ReminderService"); // Monitor start

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Calculate time until next 9 AM
                    var now = DateTime.Now;
                    var nextRun = now.Date.Add(_targetTime);
                    
                    // If it's already past 9 AM today, schedule for tomorrow
                    if (now > nextRun)
                    {
                        nextRun = nextRun.AddDays(1);
                    }

                    var delay = nextRun - now;
                    _logger.LogInformation($"Next reminder check scheduled for {nextRun} (in {delay.TotalHours:F1} hours)");
                    
                    // Report idle status with next run time
                    _jobMonitor.ReportSuccess("ReminderService", $"Waiting until {nextRun}");

                    // Wait until next scheduled time
                    await Task.Delay(delay, stoppingToken);

                    // Run reminder checks
                    _jobMonitor.ReportStart("ReminderService"); // Mark as running again
                    await CheckAndSendReminders();

                    // Also wait a bit to avoid double-running
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
                    _jobMonitor.ReportFailure("ReminderService", ex); // Report error
                    // Wait before retrying
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }

            _logger.LogInformation("Reminder Background Service stopped");
        }

        /// <summary>
        /// Checks and sends reminders for all users
        /// </summary>
        private async Task CheckAndSendReminders()
        {
            try
            {
                _logger.LogInformation("Starting daily reminder check for all users");

                // Create a scope to resolve scoped services
                using (var scope = _serviceProvider.CreateScope())
                {
                    var reminderService = scope.ServiceProvider.GetRequiredService<IReminderService>();
                    
                    // Check and send reminders for all users
                    var totalSent = await reminderService.CheckAndSendAllUsersRemindersAsync();
                    
                    _logger.LogInformation($"Daily reminder check completed. Sent {totalSent} total reminders.");
                    _jobMonitor.ReportSuccess("ReminderService", $"Completed. Sent {totalSent} reminders.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during daily reminder check");
                _jobMonitor.ReportFailure("ReminderService", ex);
                throw; // Re-throw to be caught by ExecuteAsync
            }
        }

        public override Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Reminder Background Service is stopping");
            return base.StopAsync(cancellationToken);
        }
    }
}

