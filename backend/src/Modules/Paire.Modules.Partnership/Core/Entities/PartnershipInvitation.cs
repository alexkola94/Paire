using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Partnership.Core.Entities;

[Table("partnership_invitations")]
public class PartnershipInvitation
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("inviter_id")]
    public Guid InviterId { get; set; }

    [Column("invitee_email")]
    [MaxLength(255)]
    public string InviteeEmail { get; set; } = string.Empty;

    [Column("token")]
    [MaxLength(255)]
    public string Token { get; set; } = string.Empty;

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("accepted_at")]
    public DateTime? AcceptedAt { get; set; }
}
