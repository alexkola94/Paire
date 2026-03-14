using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Analytics.Core.Entities;

[Table("achievements")]
public class Achievement
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("code")]
    [Required]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("category")]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Column("icon")]
    [MaxLength(100)]
    public string? Icon { get; set; }

    [Column("color")]
    [MaxLength(50)]
    public string? Color { get; set; }

    [Column("points")]
    public int Points { get; set; }

    [Column("rarity")]
    [MaxLength(50)]
    public string Rarity { get; set; } = "common";

    [Column("criteria_type")]
    [MaxLength(50)]
    public string CriteriaType { get; set; } = string.Empty;

    [Column("criteria_value")]
    public string? CriteriaValue { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
