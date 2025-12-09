using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Achievement model - defines available achievements in the system
    /// Each achievement has criteria that users must meet to unlock it
    /// </summary>
    [Table("achievements")]
    public class Achievement
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("code")]
        [Required]
        [MaxLength(100)]
        public string Code { get; set; } = string.Empty; // Unique identifier (e.g., "FIRST_EXPENSE", "BUDGET_MASTER")

        [Column("name")]
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty; // Display name

        [Column("description")]
        public string? Description { get; set; } // What user needs to do

        [Column("category")]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty; // "transactions", "budgets", "savings", "loans", "partnership", "consistency", "milestone"

        [Column("icon")]
        [MaxLength(100)]
        public string? Icon { get; set; } // Icon name (e.g., "FiAward", "FiStar")

        [Column("color")]
        [MaxLength(50)]
        public string? Color { get; set; } // Theme color (e.g., "primary", "secondary", "gold")

        [Column("points")]
        public int Points { get; set; } = 0; // Points awarded for this achievement

        [Column("rarity")]
        [MaxLength(50)]
        public string Rarity { get; set; } = "common"; // "common", "rare", "epic", "legendary"

        [Column("criteria_type")]
        [MaxLength(50)]
        public string CriteriaType { get; set; } = string.Empty; // "count", "amount", "streak", "date", "boolean"

        [Column("criteria_value")]
        public string? CriteriaValue { get; set; } // JSON string with criteria details

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("sort_order")]
        public int SortOrder { get; set; } = 0; // For display ordering

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// User achievement model - tracks which achievements each user has unlocked
    /// </summary>
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
        public decimal Progress { get; set; } = 0; // Progress percentage (0-100)

        [Column("is_notified")]
        public bool IsNotified { get; set; } = false; // Whether user has seen the notification

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public Achievement? Achievement { get; set; }
    }
}

