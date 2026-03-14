using Microsoft.EntityFrameworkCore;
using Paire.Modules.Notifications.Core.Entities;

namespace Paire.Modules.Notifications.Infrastructure;

public class NotificationsDbContext : DbContext
{
    public NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : base(options) { }

    public DbSet<ReminderPreferences> ReminderPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ReminderPreferences>(entity =>
        {
            entity.ToTable("reminder_preferences");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.EmailEnabled).HasColumnName("email_enabled").HasDefaultValue(true);
            entity.Property(e => e.BillRemindersEnabled).HasColumnName("bill_reminders_enabled").HasDefaultValue(true);
            entity.Property(e => e.BillReminderDays).HasColumnName("bill_reminder_days").HasDefaultValue(3);
            entity.Property(e => e.LoanRemindersEnabled).HasColumnName("loan_reminders_enabled").HasDefaultValue(true);
            entity.Property(e => e.LoanReminderDays).HasColumnName("loan_reminder_days").HasDefaultValue(7);
            entity.Property(e => e.BudgetAlertsEnabled).HasColumnName("budget_alerts_enabled").HasDefaultValue(true);
            entity.Property(e => e.BudgetAlertThreshold).HasColumnName("budget_alert_threshold").HasColumnType("decimal(18,2)").HasDefaultValue(90);
            entity.Property(e => e.SavingsMilestonesEnabled).HasColumnName("savings_milestones_enabled").HasDefaultValue(true);
            entity.Property(e => e.PrivacyHideNumbers).HasColumnName("privacy_hide_numbers").HasDefaultValue(false);
            entity.Property(e => e.DashboardOverviewMode).HasColumnName("dashboard_overview_mode").HasMaxLength(50);
            entity.Property(e => e.ChatbotPersonality).HasColumnName("chatbot_personality").HasMaxLength(50).HasDefaultValue("supportive");
            entity.Property(e => e.WeeklyRecapEnabled).HasColumnName("weekly_recap_enabled").HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId).IsUnique();
        });
    }
}
