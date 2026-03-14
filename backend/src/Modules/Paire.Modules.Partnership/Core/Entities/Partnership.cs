using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Partnership.Core.Entities;

[Table("partnerships")]
public class Partnership
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user1_id")]
    public Guid User1Id { get; set; }

    [Column("user2_id")]
    public Guid User2Id { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

public class CreatePartnershipDto
{
    public string PartnerEmail { get; set; } = string.Empty;
}

public class UpdatePartnershipDto
{
    public string Status { get; set; } = string.Empty;
}

public static class PartnershipStatus
{
    public const string Active = "active";
    public const string Inactive = "inactive";
}
