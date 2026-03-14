using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Analytics.Core.Entities;

[Table("year_reviews")]
public class YearReview
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Column("year")]
    public int Year { get; set; }

    [Column("data")]
    public string Data { get; set; } = "{}";

    [Column("generated_at")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
