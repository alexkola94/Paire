using System.Collections.Concurrent;

namespace Paire.Shared.Infrastructure.Services;

public class JobMonitorService : IJobMonitorService
{
    private readonly ConcurrentDictionary<string, JobStatusInfo> _jobStatuses = new();

    public void ReportStart(string jobName)
    {
        _jobStatuses.AddOrUpdate(jobName,
            new JobStatusInfo { Name = jobName, LastRun = DateTime.UtcNow, Status = "Running" },
            (_, old) => { old.Status = "Running"; old.LastRun = DateTime.UtcNow; return old; });
    }

    public void ReportSuccess(string jobName, string message = "Completed successfully")
    {
        _jobStatuses.AddOrUpdate(jobName,
            new JobStatusInfo { Name = jobName, Status = "Idle", LastResult = message, LastSuccess = DateTime.UtcNow },
            (_, old) => { old.Status = "Idle"; old.LastResult = message; old.LastSuccess = DateTime.UtcNow; return old; });
    }

    public void ReportFailure(string jobName, Exception ex)
    {
        _jobStatuses.AddOrUpdate(jobName,
            new JobStatusInfo { Name = jobName, Status = "Error", LastResult = ex.Message, LastError = DateTime.UtcNow },
            (_, old) => { old.Status = "Error"; old.LastResult = ex.Message; old.LastError = DateTime.UtcNow; return old; });
    }

    public IEnumerable<JobStatusInfo> GetAllJobs() => _jobStatuses.Values;
}

public class JobStatusInfo
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public DateTime LastRun { get; set; }
    public DateTime? LastSuccess { get; set; }
    public DateTime? LastError { get; set; }
    public string? LastResult { get; set; }
}
