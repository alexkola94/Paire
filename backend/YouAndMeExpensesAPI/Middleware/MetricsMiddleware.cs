using Microsoft.AspNetCore.Http;
using System.Diagnostics;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Middleware
{
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
                
                // Only track API endpoints (skip static files, swagger, etc.)
                var path = context.Request.Path.Value ?? "";
                if (path.StartsWith("/api/") && !path.Contains("metrics"))
                {
                    _metricsService.RecordRequest(path, stopwatch.Elapsed.TotalMilliseconds);
                }
            }
        }
    }
}
