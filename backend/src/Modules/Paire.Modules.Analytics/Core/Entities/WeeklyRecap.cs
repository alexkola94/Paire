using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Analytics.Core.Entities;

[Table("weekly_recaps")]
public class WeeklyRecap
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Column("week_start")]
    public DateTime WeekStart { get; set; }

    [Column("week_end")]
    public DateTime WeekEnd { get; set; }

    [Column("total_spent")]
    public decimal TotalSpent { get; set; }

    [Column("total_income")]
    public decimal TotalIncome { get; set; }

    [Column("top_categories")]
    public string? TopCategories { get; set; }

    [Column("insights")]
    public string? Insights { get; set; }

    [Column("personality_mode")]
    [MaxLength(50)]
    public string PersonalityMode { get; set; } = "supportive";

    [Column("formatted_content")]
    public string? FormattedContent { get; set; }

    [Column("email_sent")]
    public bool EmailSent { get; set; }

    [Column("notification_sent")]
    public bool NotificationSent { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
