using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Transaction model for expenses and income
    /// Enhanced with household management features
    /// Uses Entity Framework Core
    /// </summary>
    [Table("transactions")]
    public class Transaction
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("type")]
        public string Type { get; set; } = string.Empty; // "expense" or "income"

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("attachment_url")]
        public string? AttachmentUrl { get; set; }

        [Column("attachment_path")]
        public string? AttachmentPath { get; set; }

        // Enhanced features
        [Column("is_recurring")]
        public bool IsRecurring { get; set; }

        [Column("recurrence_pattern")]
        public string? RecurrencePattern { get; set; } // "daily", "weekly", "monthly", "yearly"

        [Column("recurrence_end_date")]
        public DateTime? RecurrenceEndDate { get; set; }

        [Column("paid_by")]
        public string? PaidBy { get; set; } // Who paid (for couples)

        [Column("split_type")]
        public string? SplitType { get; set; } // "equal", "percentage", "custom"

        [Column("split_percentage")]
        public decimal? SplitPercentage { get; set; }

        [Column("tags")]
        public string[]? Tags { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        // Bank sync tracking
        [Column("bank_transaction_id")]
        public string? BankTransactionId { get; set; } // External transaction ID from bank

        [Column("bank_account_id")]
        public string? BankAccountId { get; set; } // Bank account ID this transaction came from

        [Column("is_bank_synced")]
        public bool IsBankSynced { get; set; } // Flag to indicate this came from bank sync

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}

