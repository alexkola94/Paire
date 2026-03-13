using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    [Table("financial_health_scores")]
    public class FinancialHealthScore
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("overall_score")]
        public int OverallScore { get; set; }

        [Column("budget_adherence_score")]
        public int BudgetAdherenceScore { get; set; }

        [Column("savings_rate_score")]
        public int SavingsRateScore { get; set; }

        [Column("debt_health_score")]
        public int DebtHealthScore { get; set; }

        [Column("expense_consistency_score")]
        public int ExpenseConsistencyScore { get; set; }

        [Column("goal_progress_score")]
        public int GoalProgressScore { get; set; }

        [Column("tips")]
        public string? Tips { get; set; }

        [Column("calculated_at")]
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;

        [Column("period")]
        [MaxLength(10)]
        public string Period { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
