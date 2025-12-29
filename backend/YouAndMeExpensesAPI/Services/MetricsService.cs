using System.Collections.Concurrent;
using System.Diagnostics;

namespace YouAndMeExpensesAPI.Services
{
    public class MetricsService
    {
        private readonly ConcurrentDictionary<string, List<double>> _requestTimes = new();
        private readonly ConcurrentDictionary<string, int> _requestCounts = new();
        private readonly int _maxSamples = 100; // Keep last 100 samples per endpoint

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

        public Dictionary<string, object> GetMetrics()
        {
            var metrics = new Dictionary<string, object>();
            var endpointStats = new List<object>();

            foreach (var endpoint in _requestTimes.Keys)
            {
                var times = _requestTimes[endpoint];
                var count = _requestCounts.GetValueOrDefault(endpoint, 0);

                lock (times)
                {
                    if (times.Any())
                    {
                        endpointStats.Add(new
                        {
                            Endpoint = endpoint,
                            AverageMs = times.Average(),
                            MinMs = times.Min(),
                            MaxMs = times.Max(),
                            P95Ms = GetPercentile(times, 0.95),
                            TotalRequests = count,
                            RecentSamples = times.Count
                        });
                    }
                }
            }

            metrics["EndpointStats"] = endpointStats.OrderByDescending(e => ((dynamic)e).TotalRequests).ToList();
            metrics["TotalRequests"] = _requestCounts.Values.Sum();
            metrics["TrackedEndpoints"] = _requestTimes.Keys.Count;

            // System metrics
            var process = Process.GetCurrentProcess();
            metrics["MemoryUsageMB"] = process.WorkingSet64 / 1024.0 / 1024.0;
            metrics["CpuTimeSeconds"] = process.TotalProcessorTime.TotalSeconds;
            metrics["ThreadCount"] = process.Threads.Count;
            metrics["UptimeSeconds"] = (DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds;

            return metrics;
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
}
