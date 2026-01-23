namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Background service that runs hourly to check and send travel notifications
    /// Checks document expiry, budget alerts, itinerary reminders, etc.
    /// </summary>
    public class TravelNotificationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<TravelNotificationBackgroundService> _logger;
        private readonly JobMonitorService _jobMonitor;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Check every hour

        public TravelNotificationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<TravelNotificationBackgroundService> logger,
            JobMonitorService jobMonitor)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _jobMonitor = jobMonitor;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Travel Notification Background Service started");
            _jobMonitor.ReportStart("TravelNotificationService");

            // Initial delay to let the application fully start
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _jobMonitor.ReportStart("TravelNotificationService");

                    // Run notification checks
                    await CheckAndSendNotifications();

                    // Report success and wait for next interval
                    var nextRun = DateTime.Now.Add(_checkInterval);
                    _jobMonitor.ReportSuccess("TravelNotificationService", $"Waiting until {nextRun:HH:mm}");

                    _logger.LogInformation("Next travel notification check scheduled for {NextRun}", nextRun);
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Travel Notification Background Service is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Travel Notification Background Service");
                    _jobMonitor.ReportFailure("TravelNotificationService", ex);

                    // Wait before retrying (shorter than regular interval on error)
                    await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
                }
            }

            _logger.LogInformation("Travel Notification Background Service stopped");
        }

        /// <summary>
        /// Checks and sends notifications for all active trips
        /// </summary>
        private async Task CheckAndSendNotifications()
        {
            try
            {
                _logger.LogInformation("Starting hourly travel notification check");

                using (var scope = _serviceProvider.CreateScope())
                {
                    var notificationService = scope.ServiceProvider.GetRequiredService<ITravelNotificationService>();

                    // Check and send notifications for all active trips
                    var totalSent = await notificationService.CheckAllTripsNotificationsAsync();

                    _logger.LogInformation("Hourly travel notification check completed. Sent {Count} notifications.", totalSent);
                    _jobMonitor.ReportSuccess("TravelNotificationService", $"Completed. Sent {totalSent} notifications.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during hourly travel notification check");
                _jobMonitor.ReportFailure("TravelNotificationService", ex);
                throw;
            }
        }

        public override Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Travel Notification Background Service is stopping");
            return base.StopAsync(cancellationToken);
        }
    }
}
