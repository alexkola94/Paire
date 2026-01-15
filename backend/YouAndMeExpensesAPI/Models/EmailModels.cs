namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Email settings configuration
    /// Used for SMTP server connection
    /// </summary>
    public class EmailSettings
    {
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool EnableSsl { get; set; } = true;
    }

    /// <summary>
    /// Email message model
    /// </summary>
    public class EmailMessage
    {
        public string ToEmail { get; set; } = string.Empty;
        public string ToName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public bool IsHtml { get; set; } = true;
        public List<string>? Attachments { get; set; }
    }

    /// <summary>
    /// Reminder types for email notifications
    /// </summary>
    public enum ReminderType
    {
        BillDue,
        LoanPaymentDue,
        BudgetAlert,
        SavingsGoalMilestone,
        OverduePayment,
        MonthlyStatement
    }

    /// <summary>
    /// Reminder preferences model (maps to database)
    /// Also used as a general per-user preferences store.
    /// </summary>
    [System.ComponentModel.DataAnnotations.Schema.Table("reminder_preferences")]
    public class ReminderPreferences
    {
        [System.ComponentModel.DataAnnotations.Key]
        [System.ComponentModel.DataAnnotations.Schema.Column("id")]
        public Guid Id { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.Column("user_id")]
        public Guid UserId { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.Column("email_enabled")]
        public bool EmailEnabled { get; set; } = true;

        [System.ComponentModel.DataAnnotations.Schema.Column("bill_reminders_enabled")]
        public bool BillRemindersEnabled { get; set; } = true;

        [System.ComponentModel.DataAnnotations.Schema.Column("bill_reminder_days")]
        public int BillReminderDays { get; set; } = 3;

        [System.ComponentModel.DataAnnotations.Schema.Column("loan_reminders_enabled")]
        public bool LoanRemindersEnabled { get; set; } = true;

        [System.ComponentModel.DataAnnotations.Schema.Column("loan_reminder_days")]
        public int LoanReminderDays { get; set; } = 7;

        [System.ComponentModel.DataAnnotations.Schema.Column("budget_alerts_enabled")]
        public bool BudgetAlertsEnabled { get; set; } = true;

        [System.ComponentModel.DataAnnotations.Schema.Column("budget_alert_threshold")]
        public decimal BudgetAlertThreshold { get; set; } = 90; // percentage

        [System.ComponentModel.DataAnnotations.Schema.Column("savings_milestones_enabled")]
        public bool SavingsMilestonesEnabled { get; set; } = true;

        /// <summary>
        /// When true, user prefers to hide financial numbers in the UI (privacy mode).
        /// </summary>
        [System.ComponentModel.DataAnnotations.Schema.Column("privacy_hide_numbers")]
        public bool PrivacyHideNumbers { get; set; } = false;

        [System.ComponentModel.DataAnnotations.Schema.Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}

