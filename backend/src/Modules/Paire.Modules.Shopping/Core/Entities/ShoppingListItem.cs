using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Shopping.Core.Entities;

[Table("shopping_list_items")]
public class ShoppingListItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("shopping_list_id")]
    public Guid ShoppingListId { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Column("unit")]
    public string? Unit { get; set; }

    [Column("estimated_price")]
    public decimal? EstimatedPrice { get; set; }

    [Column("actual_price")]
    public decimal? ActualPrice { get; set; }

    [Column("is_checked")]
    public bool IsChecked { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
