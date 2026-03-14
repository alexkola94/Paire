using System.Collections.Concurrent;

namespace Paire.Shared.Infrastructure.Services;

public class MetricsService
{
    private long _totalRequests;
    private readonly ConcurrentDictionary<string, long> _endpointCounts = new();
    private readonly ConcurrentDictionary<string, double> _endpointTotalMs = new();

    public void RecordRequest(string endpoint, double durationMs)
    {
        Interlocked.Increment(ref _totalRequests);

        var normalizedEndpoint = NormalizeEndpoint(endpoint);
        _endpointCounts.AddOrUpdate(normalizedEndpoint, 1, (_, count) => count + 1);
        _endpointTotalMs.AddOrUpdate(normalizedEndpoint, durationMs, (_, total) => total + durationMs);
    }

    public long TotalRequests => _totalRequests;

    public Dictionary<string, object> GetEndpointStats()
    {
        var stats = new Dictionary<string, object>();
        foreach (var kvp in _endpointCounts)
        {
            var totalMs = _endpointTotalMs.GetValueOrDefault(kvp.Key, 0);
            stats[kvp.Key] = new
            {
                count = kvp.Value,
                avgMs = kvp.Value > 0 ? Math.Round(totalMs / kvp.Value, 2) : 0
            };
        }
        return stats;
    }

    private static string NormalizeEndpoint(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length <= 2) return path;

        for (int i = 2; i < segments.Length; i++)
        {
            if (Guid.TryParse(segments[i], out _) || int.TryParse(segments[i], out _))
            {
                segments[i] = "{id}";
            }
        }
        return "/" + string.Join("/", segments);
    }
}
