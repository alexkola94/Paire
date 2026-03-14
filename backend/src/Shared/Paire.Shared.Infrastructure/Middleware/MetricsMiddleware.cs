using System.Diagnostics;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Shared.Infrastructure.Middleware;

public class MetricsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly MetricsService _metricsService;

    public MetricsMiddleware(RequestDelegate next, MetricsService metricsService)
    {
        _next = next;
        _metricsService = metricsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            var path = context.Request.Path.Value ?? "";
            if (path.StartsWith("/api/") && !path.Contains("metrics"))
            {
                _metricsService.RecordRequest(path, stopwatch.Elapsed.TotalMilliseconds);
            }
        }
    }
}
