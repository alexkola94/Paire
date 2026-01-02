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

                    // Broadcast metrics in the format expected by Watchtower Client
                    
                    // 1. System Stats
                    var systemStats = new
                    {
                        memoryUsageMb = (int)metrics.MemoryUsageMB,
                        threadCount = metrics.ThreadCount
                    };
                    await _hubContext.Clients.All.SendAsync("ReceiveSystemStats", systemStats, stoppingToken);

                    // 2. Request Stats (Snapshot)
                    // We create a synthetic "tick" stat representing the current state
                    var avgLatency = metrics.EndpointStats.Any() 
                        ? metrics.EndpointStats.Average(e => e.AverageMs) 
                        : 0;

                    var requestStats = new
                    {
                        latencyMs = avgLatency,
                        activeRequests = 0, // Not currently tracked
                        method = "AVG",
                        path = "System",
                        statusCode = 200,
                        totalRequests = metrics.TotalRequests
                    };
                    await _hubContext.Clients.All.SendAsync("ReceiveRequestStats", requestStats, stoppingToken);
                    
                    // 3. Active Requests (Placeholder for now)
                    await _hubContext.Clients.All.SendAsync("ReceiveActiveRequests", new List<object>(), stoppingToken);

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
