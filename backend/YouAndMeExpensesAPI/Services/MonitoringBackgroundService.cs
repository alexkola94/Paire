using Microsoft.AspNetCore.SignalR;
using YouAndMeExpensesAPI.Hubs;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Services
{
    public class MonitoringBackgroundService : BackgroundService
    {
        private readonly IHubContext<MonitoringHub> _hubContext;
        private readonly MetricsService _metricsService;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MonitoringBackgroundService> _logger;

        public MonitoringBackgroundService(
            IHubContext<MonitoringHub> hubContext,
            MetricsService metricsService,
            IServiceProvider serviceProvider,
            ILogger<MonitoringBackgroundService> logger)
        {
            _hubContext = hubContext;
            _metricsService = metricsService;
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Monitoring Background Service started.");

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(3));

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    // 1. Get Metrics
                    var metrics = _metricsService.GetMetrics();

                    // 2. Get Active Sessions (Need scope for scoped service)
                    // Note: We're doing this inside the loop, so creating a scope is necessary if ISessionService is scoped
                    // However, for performance, we might want to optimize or skip if no clients connected (hard to know with standard SignalR without tracking).
                    // For now, let's just broadcast metrics. DB calls every 3s might be heavy if not careful.
                    // Let's stick to system metrics for the high-frequency update.
                    
                    // Broadcast metrics
                    await _hubContext.Clients.All.SendAsync("ReceiveMetrics", metrics, stoppingToken);

                    // Optional: Broadcast DB health/heavy stats less frequently?
                    // For now, let's keep it simple. The frontend can still pool sessions/db health if needed, 
                    // or we can add it here.
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error broadcasting metrics");
                }
            }
        }
    }
}
