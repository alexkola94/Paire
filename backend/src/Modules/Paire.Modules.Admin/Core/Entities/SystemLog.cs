using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Admin.Core.Entities;

[Table("system_logs")]
public class SystemLog
{
    public Guid Id { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public DateTime CreatedAt { get; set; }
}

[Table("audit_logs")]
public class AuditLog
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}

[Table("data_clearing_requests")]
public class DataClearingRequest
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
