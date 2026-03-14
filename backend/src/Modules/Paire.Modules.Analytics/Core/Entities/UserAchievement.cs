using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Analytics.Core.Entities;

[Table("user_achievements")]
public class UserAchievement
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Column("achievement_id")]
    [Required]
    public Guid AchievementId { get; set; }

    [Column("unlocked_at")]
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

    [Column("progress")]
    public decimal Progress { get; set; }

    [Column("is_notified")]
    public bool IsNotified { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Achievement? Achievement { get; set; }
}
