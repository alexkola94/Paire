using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Audit log model for tracking administrative actions and security events
    /// </summary>
    [Table("audit_logs")]
    public class AuditLog
    {
        /// <summary>
        /// Unique audit log identifier
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// ID of the user who performed the action (admin)
        /// </summary>
        [Required]
        [Column("user_id")]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Action performed (e.g., "UserLocked", "TwoFactorReset", "JobTriggered")
        /// </summary>
        [Required]
        [Column("action")]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Type of entity affected (e.g., "User", "Job", "System")
        /// </summary>
        [Column("entity_type")]
        [MaxLength(50)]
        public string? EntityType { get; set; }

        /// <summary>
        /// ID of the affected entity
        /// </summary>
        [Column("entity_id")]
        [MaxLength(450)]
        public string? EntityId { get; set; }

        /// <summary>
        /// Additional details about the action (JSON format)
        /// </summary>
        [Column("details")]
        public string? Details { get; set; }

        /// <summary>
        /// IP address from which the action was performed
        /// </summary>
        [Column("ip_address")]
        [MaxLength(45)] // IPv6 max length
        public string? IpAddress { get; set; }

        /// <summary>
        /// User agent string
        /// </summary>
        [Column("user_agent")]
        [MaxLength(500)]
        public string? UserAgent { get; set; }

        /// <summary>
        /// When the action was performed
        /// </summary>
        [Column("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Severity level (Info, Warning, Critical)
        /// </summary>
        [Column("severity")]
        [MaxLength(20)]
        public string Severity { get; set; } = "Info";
    }
}
