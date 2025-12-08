using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// User session model for tracking active user sessions
    /// Used to invalidate old sessions when a new login occurs
    /// </summary>
    [Table("user_sessions")]
    public class UserSession
    {
        /// <summary>
        /// Unique session identifier
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// User ID (foreign key to AspNetUsers)
        /// </summary>
        [Required]
        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// JWT token identifier (JTI claim from token)
        /// </summary>
        [Required]
        [Column("token_id")]
        [MaxLength(255)]
        public string TokenId { get; set; } = string.Empty;

        /// <summary>
        /// Refresh token (hashed for security)
        /// </summary>
        [Column("refresh_token_hash")]
        [MaxLength(255)]
        public string? RefreshTokenHash { get; set; }

        /// <summary>
        /// IP address of the client
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
        /// When the session was created
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the session expires (based on token expiration)
        /// </summary>
        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// When the session was last accessed
        /// </summary>
        [Column("last_accessed_at")]
        public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Whether the session is active
        /// </summary>
        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// When the session was revoked (if revoked)
        /// </summary>
        [Column("revoked_at")]
        public DateTime? RevokedAt { get; set; }
    }
}

