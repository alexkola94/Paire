using You AndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IAuditService
    {
        /// <summary>
        /// Log an audit action
        /// </summary>
        Task LogAsync(string userId, string action, string? entityType = null, string? entityId = null, string? details = null, string? ipAddress = null, string? userAgent = null, string severity = "Info");

        /// <summary>
        /// Get audit logs with pagination and filtering
        /// </summary>
        Task<(List<AuditLog> logs, int totalCount)> GetLogsAsync(string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 50);

        /// <summary>
        /// Get security alerts (recent failed logins, suspicious activity)
        /// </summary>
        Task<List<object>> GetSecurityAlertsAsync();
    }
}
