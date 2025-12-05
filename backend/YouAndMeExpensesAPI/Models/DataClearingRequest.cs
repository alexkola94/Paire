using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Data clearing request model
    /// Tracks requests to clear all data with partner confirmation support
    /// </summary>
    [Table("data_clearing_requests")]
    public class DataClearingRequest
    {
        /// <summary>
        /// Unique request ID
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        /// <summary>
        /// User who initiated the clearing request
        /// </summary>
        [Column("requester_user_id")]
        [Required]
        public Guid RequesterUserId { get; set; }

        /// <summary>
        /// Partner user ID (if partnership exists)
        /// </summary>
        [Column("partner_user_id")]
        public Guid? PartnerUserId { get; set; }

        /// <summary>
        /// Whether requester has confirmed the action
        /// </summary>
        [Column("requester_confirmed")]
        public bool RequesterConfirmed { get; set; } = true; // Auto-confirmed when created

        /// <summary>
        /// Whether partner has confirmed the action
        /// </summary>
        [Column("partner_confirmed")]
        public bool PartnerConfirmed { get; set; } = false;

        /// <summary>
        /// Confirmation token for partner (sent via email)
        /// </summary>
        [Column("confirmation_token")]
        public string? ConfirmationToken { get; set; }

        /// <summary>
        /// Request status: pending, approved, executed, cancelled, expired
        /// </summary>
        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// When the request was created
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// When the request expires (48 hours by default)
        /// </summary>
        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// When the data was actually cleared (if executed)
        /// </summary>
        [Column("executed_at")]
        public DateTime? ExecutedAt { get; set; }

        /// <summary>
        /// Additional notes or reason for clearing
        /// </summary>
        [Column("notes")]
        public string? Notes { get; set; }
    }

    /// <summary>
    /// DTO for initiating a data clearing request
    /// </summary>
    public class InitiateDataClearingRequest
    {
        /// <summary>
        /// Optional reason or notes
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// Confirmation - user must type "DELETE ALL MY DATA" to confirm
        /// </summary>
        [Required]
        public string ConfirmationPhrase { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for confirming a data clearing request (partner)
    /// </summary>
    public class ConfirmDataClearingRequest
    {
        /// <summary>
        /// Confirmation token sent via email
        /// </summary>
        [Required]
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// Whether partner approves or denies the request
        /// </summary>
        [Required]
        public bool Approve { get; set; }
    }

    /// <summary>
    /// Response for data clearing request status
    /// </summary>
    public class DataClearingRequestResponse
    {
        public Guid RequestId { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool RequiresPartnerApproval { get; set; }
        public bool PartnerConfirmed { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? Message { get; set; }
    }
}

