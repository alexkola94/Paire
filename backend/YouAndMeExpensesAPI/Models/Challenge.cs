using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    [Table("challenges")]
    public class Challenge
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

        [Column("challenge_type")]
        [Required]
        [MaxLength(50)]
        public string ChallengeType { get; set; } = "weekly";

        [Column("category")]
        [MaxLength(50)]
        public string Category { get; set; } = "spending";

        [Column("icon")]
        [MaxLength(100)]
        public string? Icon { get; set; }

        [Column("criteria_type")]
        [MaxLength(50)]
        public string CriteriaType { get; set; } = "amount";

        [Column("criteria_value")]
        public string? CriteriaValue { get; set; }

        [Column("reward_points")]
        public int RewardPoints { get; set; } = 50;

        [Column("difficulty")]
        [MaxLength(20)]
        public string Difficulty { get; set; } = "medium";

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("is_recurring")]
        public bool IsRecurring { get; set; } = true;

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("user_challenges")]
    public class UserChallenge
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("challenge_id")]
        [Required]
        public Guid ChallengeId { get; set; }

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("progress")]
        public decimal Progress { get; set; }

        [Column("target_value")]
        public decimal TargetValue { get; set; }

        [Column("current_value")]
        public decimal CurrentValue { get; set; }

        [Column("started_at")]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        [Column("reward_claimed")]
        public bool RewardClaimed { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Challenge? Challenge { get; set; }
    }
}
