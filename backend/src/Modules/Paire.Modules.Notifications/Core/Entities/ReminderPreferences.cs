using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Notifications.Core.Entities;

[Table("reminder_preferences")]
public class ReminderPreferences
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("email_enabled")]
    public bool EmailEnabled { get; set; } = true;

    [Column("bill_reminders_enabled")]
    public bool BillRemindersEnabled { get; set; } = true;

    [Column("bill_reminder_days")]
    public int BillReminderDays { get; set; } = 3;

    [Column("loan_reminders_enabled")]
    public bool LoanRemindersEnabled { get; set; } = true;

    [Column("loan_reminder_days")]
    public int LoanReminderDays { get; set; } = 7;

    [Column("budget_alerts_enabled")]
    public bool BudgetAlertsEnabled { get; set; } = true;

    [Column("budget_alert_threshold")]
    public decimal BudgetAlertThreshold { get; set; } = 90;

    [Column("savings_milestones_enabled")]
    public bool SavingsMilestonesEnabled { get; set; } = true;

    [Column("privacy_hide_numbers")]
    public bool PrivacyHideNumbers { get; set; }

    [Column("dashboard_overview_mode")]
    [MaxLength(50)]
    public string? DashboardOverviewMode { get; set; }

    [Column("chatbot_personality")]
    [MaxLength(50)]
    public string ChatbotPersonality { get; set; } = "supportive";

    [Column("weekly_recap_enabled")]
    public bool WeeklyRecapEnabled { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
