using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Shopping.Core.Entities;

[Table("shopping_lists")]
public class ShoppingList
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("category")]
    public string? Category { get; set; }

    [Column("is_completed")]
    public bool IsCompleted { get; set; }

    [Column("completed_date")]
    public DateTime? CompletedDate { get; set; }

    [Column("estimated_total")]
    public decimal? EstimatedTotal { get; set; }

    [Column("actual_total")]
    public decimal? ActualTotal { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
