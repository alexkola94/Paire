using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Identity.Core.Entities
{
    [Table("user_streaks")]
    public class UserStreak
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("streak_type")]
        [Required]
        [MaxLength(50)]
        public string StreakType { get; set; } = string.Empty;

        [Column("current_streak")]
        public int CurrentStreak { get; set; }

        [Column("longest_streak")]
        public int LongestStreak { get; set; }

        [Column("last_activity_date")]
        public DateTime? LastActivityDate { get; set; }

        [Column("total_points")]
        public int TotalPoints { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
