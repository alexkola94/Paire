namespace Paire.Shared.Infrastructure.Services;

public interface IJobMonitorService
{
    void ReportStart(string jobName);
    void ReportSuccess(string jobName, string message = "Completed successfully");
    void ReportFailure(string jobName, Exception ex);
}
