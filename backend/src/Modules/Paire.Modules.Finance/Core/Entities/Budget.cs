using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Finance.Core.Entities;

[Table("budgets")]
public class Budget
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("category")] public string Category { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("period")] public string Period { get; set; } = "monthly";
    [Column("start_date")] public DateTime StartDate { get; set; }
    [Column("end_date")] public DateTime? EndDate { get; set; }
    [Column("spent_amount")] public decimal SpentAmount { get; set; }
    [Column("is_active")] public bool IsActive { get; set; } = true;
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
}

[Table("savings_goals")]
public class SavingsGoal
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("target_amount")] public decimal TargetAmount { get; set; }
    [Column("current_amount")] public decimal CurrentAmount { get; set; }
    [Column("target_date")] public DateTime? TargetDate { get; set; }
    [Column("priority")] public string Priority { get; set; } = "medium";
    [Column("category")] public string? Category { get; set; }
    [Column("icon")] public string? Icon { get; set; }
    [Column("color")] public string? Color { get; set; }
    [Column("is_achieved")] public bool IsAchieved { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
}

[Table("recurring_bills")]
public class RecurringBill
{
    [Key] [Column("id")] public Guid Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("category")] public string Category { get; set; } = string.Empty;
    [Column("frequency")] public string Frequency { get; set; } = "monthly";
    [Column("due_day")] public int DueDay { get; set; }
    [Column("next_due_date")] public DateTime NextDueDate { get; set; }
    [Column("auto_pay")] public bool AutoPay { get; set; }
    [Column("reminder_days")] public int ReminderDays { get; set; } = 3;
    [Column("is_active")] public bool IsActive { get; set; } = true;
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; }
    [Column("updated_at")] public DateTime UpdatedAt { get; set; }
    public virtual ICollection<RecurringBillAttachment> Attachments { get; set; } = new List<RecurringBillAttachment>();
}
