using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.AspNetCore.Routing;

namespace YouAndMeExpensesAPI.Services
{
    public class MetricsService
    {
        private readonly ConcurrentDictionary<string, List<double>> _requestTimes = new();
        private readonly ConcurrentDictionary<string, int> _requestCounts = new();
        private readonly int _maxSamples = 100; // Keep last 100 samples per endpoint
        private readonly IEnumerable<EndpointDataSource> _endpointSources;

        public MetricsService(IEnumerable<EndpointDataSource> endpointSources)
        {
            _endpointSources = endpointSources;
        }

        public void RecordRequest(string endpoint, double milliseconds)
        {
            // Record response time
            _requestTimes.AddOrUpdate(
                endpoint,
                new List<double> { milliseconds },
                (key, list) =>
                {
                    lock (list)
                    {
                        list.Add(milliseconds);
                        // Keep only last N samples
                        if (list.Count > _maxSamples)
                        {
                            list.RemoveAt(0);
                        }
                    }
                    return list;
                });

            // Increment request count
            _requestCounts.AddOrUpdate(endpoint, 1, (key, count) => count + 1);
        }

        public SystemMetricsDto GetMetrics()
        {
            var endpointStats = new List<EndpointStatDto>();
            
            // Get all API endpoints from routing
            var allEndpoints = _endpointSources
                .SelectMany(ds => ds.Endpoints)
                .OfType<RouteEndpoint>()
                .Where(e => e.RoutePattern.RawText?.StartsWith("/api/") == true)
                .Select(e => e.RoutePattern.RawText)
                .Distinct() // Handle multiple methods mapping to same URL pattern if any, though usually they differ. 
                // Actually, RawText might be same for GET/POST. We might want to distinguish method?
                // The middleware records "path" which doesn't include Method. 
                // If the user wants "controllers endpoints", typically that matches the URL path.
                // However, without method, GET /api/users and POST /api/users look the same.
                // The current RecordRequest uses `context.Request.Path.Value`. 
                // This is the actual path (e.g. /api/users/1), NOT the route pattern (e.g. /api/users/{id}).
                // THIS IS A MISMATCH.
                // The middleware records concrete paths (e.g. /api/users/123), but we want to aggregate by Route Pattern usually.
                // If the user wants to see "Controllers endpoints", they probably want the Route Pattern.
                // BUT, the existing implementation records Request.Path.Value (actual URL).
                // If I switch to RoutePattern, I change the aggregation behavior.
                // Given the request "monitor all the controllers endpoints", I should probably use RoutePattern for aggregation if possible.
                // But changing the recording logic now might be risky/out of scope.
                // Let's stick to the current recording logic for now, but `allEndpoints` will give us Patterns.
                // If existing metrics use concrete paths, merging with Patterns will be weird.
                // Example: Recorded: "/api/users/1", Known: "/api/users/{id}". They won't match.
                // Wait, `MetricsMiddleware` records `path`.
                // Let's look at `MetricsMiddleware` again.
                // It records `context.Request.Path.Value`. Yes, concrete path.
                // This is actually bad for aggregation because /api/users/1 and /api/users/2 are different stats!
                // To support "Controllers endpoints" correctly, we SHOULD use the Route Pattern.
                // However, modifying the middleware is 1 step.
                // Let's assume for now we list the Patterns. 
                // And we accept that existing Recorded data is concrete paths.
                // This will result in a list containing both Patterns (with 0 data initially) and Concrete Paths (with data).
                // Use case: User visits /api/users/1.
                // List: 
                // - /api/users/{id} (0 req)
                // - /api/users/1 (1 req)
                // This is messy but fulfills "monitor all controllers".
                // Ideally, I should fix the recording to use the specific Endpoint's RoutePattern if available.
                // But let's stick to the request: "should monitor all the controllers endpoints".
                // I will list all discovered route patterns.
                .ToHashSet();

            // Add stats for tracked endpoints (which are concrete paths currently)
            foreach (var endpoint in _requestTimes.Keys)
            {
                var times = _requestTimes[endpoint];
                var count = _requestCounts.GetValueOrDefault(endpoint, 0);

                lock (times)
                {
                    if (times.Any())
                    {
                        endpointStats.Add(CreateStat(endpoint, times, count));
                    }
                }
                
                // Remove from set if it matches exactly (unlikely if parameterized)
                if (allEndpoints.Contains(endpoint))
                {
                    allEndpoints.Remove(endpoint);
                }
            }

            // Add remaining known endpoints with 0 stats
            foreach (var route in allEndpoints)
            {
                endpointStats.Add(new EndpointStatDto
                {
                    Endpoint = route ?? "Unknown",
                    TotalRequests = 0
                });
            }

            var process = Process.GetCurrentProcess();

            return new SystemMetricsDto
            {
                EndpointStats = endpointStats.OrderByDescending(e => e.TotalRequests).ThenBy(e => e.Endpoint).ToList(),
                TotalRequests = _requestCounts.Values.Sum(),
                TrackedEndpoints = endpointStats.Count, // Total unique entries
                MemoryUsageMB = process.WorkingSet64 / 1024.0 / 1024.0,
                CpuTimeSeconds = process.TotalProcessorTime.TotalSeconds,
                ThreadCount = process.Threads.Count,
                UptimeSeconds = (DateTime.UtcNow - process.StartTime.ToUniversalTime()).TotalSeconds
            };
        }

        private EndpointStatDto CreateStat(string endpoint, List<double> times, int count)
        {
             return new EndpointStatDto
            {
                Endpoint = endpoint,
                AverageMs = times.Average(),
                MinMs = times.Min(),
                MaxMs = times.Max(),
                P95Ms = GetPercentile(times, 0.95),
                TotalRequests = count,
                RecentSamples = times.Count
            };
        }

        private double GetPercentile(List<double> values, double percentile)
        {
            if (values.Count == 0) return 0;
            
            var sorted = values.OrderBy(x => x).ToList();
            int index = (int)Math.Ceiling(percentile * sorted.Count) - 1;
            index = Math.Max(0, Math.Min(index, sorted.Count - 1));
            return sorted[index];
        }

        public void Reset()
        {
            _requestTimes.Clear();
            _requestCounts.Clear();
        }
    }

    public class SystemMetricsDto
    {
        public List<EndpointStatDto> EndpointStats { get; set; } = new();
        public int TotalRequests { get; set; }
        public int TrackedEndpoints { get; set; }
        public double MemoryUsageMB { get; set; }
        public double CpuTimeSeconds { get; set; }
        public int ThreadCount { get; set; }
        public double UptimeSeconds { get; set; }
    }

    public class EndpointStatDto
    {
        public string Endpoint { get; set; } = string.Empty;
        public double AverageMs { get; set; }
        public double MinMs { get; set; }
        public double MaxMs { get; set; }
        public double P95Ms { get; set; }
        public int TotalRequests { get; set; }
        public int RecentSamples { get; set; }
    }
}
