using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Partnership invitation model for tracking pending invitations
    /// Uses Entity Framework Core
    /// </summary>
    [Table("partnership_invitations")]
    public class PartnershipInvitation
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        /// <summary>
        /// ID of the user sending the invitation
        /// </summary>
        [Column("inviter_id")]
        public Guid InviterId { get; set; }

        /// <summary>
        /// Email address of the invited partner
        /// </summary>
        [Column("invitee_email")]
        [MaxLength(255)]
        public string InviteeEmail { get; set; } = string.Empty;

        /// <summary>
        /// Token for accepting the invitation (sent in email link)
        /// </summary>
        [Column("token")]
        [MaxLength(255)]
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// Invitation status: "pending", "accepted", "expired", "cancelled"
        /// </summary>
        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// When the invitation expires (default: 7 days)
        /// </summary>
        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// When the invitation was created
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the invitation was accepted (if applicable)
        /// </summary>
        [Column("accepted_at")]
        public DateTime? AcceptedAt { get; set; }
    }
}

