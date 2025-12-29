using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class AuditService : IAuditService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AuditService> _logger;

        public AuditService(AppDbContext context, ILogger<AuditService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Log an audit action
        /// </summary>
        public async Task LogAsync(string userId, string action, string? entityType = null, string? entityId = null, string? details = null, string? ipAddress = null, string? userAgent = null, string severity = "Info")
        {
            try
            {
                var auditLog = new AuditLog
                {
                    UserId = userId,
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    Details = details,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    Severity = severity,
                    Timestamp = DateTime.UtcNow
                };

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Audit Log: {action} by user {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to create audit log for action: {action}");
                // Don't throw - audit logging should not break the main flow
            }
        }

        /// <summary>
        /// Get audit logs with pagination and filtering
        /// </summary>
        public async Task<(List<AuditLog> logs, int totalCount)> GetLogsAsync(string? userId = null, string? action = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 50)
        {
            try
            {
                var query = _context.AuditLogs.AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(userId))
                {
                    query = query.Where(l => l.UserId == userId);
                }

                if (!string.IsNullOrEmpty(action))
                {
                    query = query.Where(l => l.Action == action);
                }

                if (startDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp >= startDate.Value);
                }

                if (endDate.HasValue)
                {
                    query = query.Where(l => l.Timestamp <= endDate.Value);
                }

                // Get total count
                var totalCount = await query.CountAsync();

                // Apply pagination
                var logs = await query
                    .OrderByDescending(l => l.Timestamp)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return (logs, totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve audit logs");
                return (new List<AuditLog>(), 0);
            }
        }

        /// <summary>
        /// Get security alerts (recent failed logins, suspicious activity)
        /// </summary>
        public async Task<List<object>> GetSecurityAlertsAsync()
        {
            try
            {
                var alerts = new List<object>();
                var last24Hours = DateTime.UtcNow.AddHours(-24);

                // Failed login attempts
                var failedLogins = await _context.AuditLogs
                    .Where(l => l.Action == "LoginFailed" && l.Timestamp >= last24Hours)
                    .GroupBy(l => l.IpAddress)
                    .Select(g => new
                    {
                        Type = "FailedLogin",
                        IpAddress = g.Key,
                        Count = g.Count(),
                        LastAttempt = g.Max(l => l.Timestamp),
                        Severity = g.Count() > 5 ? "Critical" : "Warning"
                    })
                    .Where(a => a.Count > 3) // Only show if more than 3 attempts
                    .ToListAsync();

                alerts.AddRange(failedLogins);

                // Suspicious admin activity (multiple critical actions in short time)
                var criticalActions = await _context.AuditLogs
                    .Where(l => l.Severity == "Critical" && l.Timestamp >= last24Hours)
                    .GroupBy(l => l.UserId)
                    .Select(g => new
                    {
                        Type = "SuspiciousActivity",
                        UserId = g.Key,
                        ActionCount = g.Count(),
                        Actions = g.Select(l => l.Action).Distinct().ToList(),
                        LastAction = g.Max(l => l.Timestamp),
                        Severity = "Warning"
                    })
                    .Where(a => a.ActionCount > 10) // More than 10 critical actions
                    .ToListAsync();

                alerts.AddRange(criticalActions);

                return alerts.OrderByDescending(a => ((dynamic)a).LastAction ?? ((dynamic)a).LastAttempt).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve security alerts");
                return new List<object>();
            }
        }
    }
}
