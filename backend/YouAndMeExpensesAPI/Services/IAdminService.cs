using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Models.Admin;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service contract for admin dashboard, monitoring, and maintenance operations.
    /// </summary>
    public interface IAdminService
    {
        Task<object> GetSystemStatsAsync();
        Task<object> GetHealthAsync();
        Task<object> GetUsersAsync(string? search);
        Task<object> GetSystemLogsAsync(int page, int pageSize, string? level);
        Task<object> GetJobStatsAsync();
        object GetFeatures(string apiBaseUrl);
        Task<object> LockUserAsync(string id, string? actingUserId, string? actingUserName);
        Task<object?> UnlockUserAsync(string id, string? actingUserId, string? actingUserName);
        object GetVersion();
        Task<object> TriggerReminderJobAsync();
        Task<object> DeleteJobAsync(string name);
        Task<(IReadOnlyList<AuditLog> Logs, int TotalCount)> GetAuditLogsAsync(
            string? userId,
            string? action,
            DateTime? startDate,
            DateTime? endDate,
            int page,
            int pageSize);
        Task<IReadOnlyList<object>> GetSecurityAlertsAsync();
        Task<object> SetMaintenanceModeAsync(MaintenanceModeRequest model, string bearerToken);
        Task<object> BroadcastMessageAsync(BroadcastRequest model, string bearerToken);
        object ClearCache();
    }
}

