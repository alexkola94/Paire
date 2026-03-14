using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Finance.Core.Entities;

[Table("transactions")]
public class Transaction
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("type")] public string Type { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("category")] public string Category { get; set; } = string.Empty;
    [Column("description")] public string? Description { get; set; }
    [Column("date")] public DateTime Date { get; set; }
    [Column("attachment_url")] public string? AttachmentUrl { get; set; }
    [Column("attachment_path")] public string? AttachmentPath { get; set; }
    [Column("is_recurring")] public bool IsRecurring { get; set; }
    [Column("recurrence_pattern")] public string? RecurrencePattern { get; set; }
    [Column("recurrence_end_date")] public DateTime? RecurrenceEndDate { get; set; }
    [Column("paid_by")] public string? PaidBy { get; set; }
    [Column("split_type")] public string? SplitType { get; set; }
    [Column("split_percentage")] public decimal? SplitPercentage { get; set; }
    [Column("tags")] public string[]? Tags { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("bank_transaction_id")] public string? BankTransactionId { get; set; }
    [Column("bank_account_id")] public string? BankAccountId { get; set; }
    [Column("is_bank_synced")] public bool IsBankSynced { get; set; }
    [Column("import_history_id")] public Guid? ImportHistoryId { get; set; }
    [ForeignKey("ImportHistoryId")] public ImportHistory? ImportHistory { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
}
