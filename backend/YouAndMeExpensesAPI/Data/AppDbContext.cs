using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Data
{
    /// <summary>
    /// Entity Framework DbContext for the application
    /// Uses PostgreSQL hosted on Supabase
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSets for all entities
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Loan> Loans { get; set; }
        public DbSet<LoanPayment> LoanPayments { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Partnership> Partnerships { get; set; }
        public DbSet<Budget> Budgets { get; set; }
        public DbSet<SavingsGoal> SavingsGoals { get; set; }
        public DbSet<RecurringBill> RecurringBills { get; set; }
        public DbSet<ReminderPreferences> ReminderPreferences { get; set; }
        public DbSet<ShoppingList> ShoppingLists { get; set; }
        public DbSet<ShoppingListItem> ShoppingListItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Ignore Supabase SDK types that EF Core shouldn't manage
            modelBuilder.Ignore<Supabase.SupabaseOptions>();
            modelBuilder.Ignore<Supabase.Client>();
            modelBuilder.Ignore<Supabase.Postgrest.ClientOptions>();
            modelBuilder.Ignore<Supabase.Postgrest.Client>();

            // ============================================
            // TRANSACTIONS TABLE
            // ============================================
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.ToTable("transactions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Date).HasColumnName("date");
                entity.Property(e => e.AttachmentUrl).HasColumnName("attachment_url");
                entity.Property(e => e.AttachmentPath).HasColumnName("attachment_path");
                entity.Property(e => e.IsRecurring).HasColumnName("is_recurring").HasDefaultValue(false);
                entity.Property(e => e.RecurrencePattern).HasColumnName("recurrence_pattern");
                entity.Property(e => e.RecurrenceEndDate).HasColumnName("recurrence_end_date");
                entity.Property(e => e.PaidBy).HasColumnName("paid_by");
                entity.Property(e => e.SplitType).HasColumnName("split_type");
                entity.Property(e => e.SplitPercentage).HasColumnName("split_percentage").HasColumnType("decimal(5,2)");
                entity.Property(e => e.Tags).HasColumnName("tags");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.Type);
            });

            // ============================================
            // LOANS TABLE
            // ============================================
            modelBuilder.Entity<Loan>(entity =>
            {
                entity.ToTable("loans");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.LentBy).HasColumnName("lent_by");
                entity.Property(e => e.BorrowedBy).HasColumnName("borrowed_by");
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Date).HasColumnName("date");
                entity.Property(e => e.DurationYears).HasColumnName("duration_years");
                entity.Property(e => e.DurationMonths).HasColumnName("duration_months");
                entity.Property(e => e.InterestRate).HasColumnName("interest_rate").HasColumnType("decimal(5,2)");
                entity.Property(e => e.HasInstallments).HasColumnName("has_installments").HasDefaultValue(false);
                entity.Property(e => e.InstallmentAmount).HasColumnName("installment_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.InstallmentFrequency).HasColumnName("installment_frequency");
                entity.Property(e => e.TotalPaid).HasColumnName("total_paid").HasColumnType("decimal(18,2)").HasDefaultValue(0);
                entity.Property(e => e.RemainingAmount).HasColumnName("remaining_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.NextPaymentDate).HasColumnName("next_payment_date");
                entity.Property(e => e.DueDate).HasColumnName("due_date");
                entity.Property(e => e.IsSettled).HasColumnName("is_settled").HasDefaultValue(false);
                entity.Property(e => e.SettledDate).HasColumnName("settled_date");
                entity.Property(e => e.Category).HasColumnName("category");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsSettled);
            });

            // ============================================
            // LOAN PAYMENTS TABLE
            // ============================================
            modelBuilder.Entity<LoanPayment>(entity =>
            {
                entity.ToTable("loan_payments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.LoanId).HasColumnName("loan_id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.PaymentDate).HasColumnName("payment_date");
                entity.Property(e => e.PrincipalAmount).HasColumnName("principal_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.InterestAmount).HasColumnName("interest_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.LoanId);
                entity.HasIndex(e => e.UserId);
            });

            // ============================================
            // USER PROFILES TABLE
            // ============================================
            modelBuilder.Entity<UserProfile>(entity =>
            {
                entity.ToTable("user_profiles");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(255);
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
                entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.Email).IsUnique();
            });

            // ============================================
            // PARTNERSHIPS TABLE
            // ============================================
            modelBuilder.Entity<Partnership>(entity =>
            {
                entity.ToTable("partnerships");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.User1Id).HasColumnName("user1_id").IsRequired();
                entity.Property(e => e.User2Id).HasColumnName("user2_id").IsRequired();
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => new { e.User1Id, e.User2Id }).IsUnique();
                entity.HasIndex(e => e.Status);
            });

            // ============================================
            // BUDGETS TABLE
            // ============================================
            modelBuilder.Entity<Budget>(entity =>
            {
                entity.ToTable("budgets");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.SpentAmount).HasColumnName("spent_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Period).HasColumnName("period").HasMaxLength(50);
                entity.Property(e => e.StartDate).HasColumnName("start_date");
                entity.Property(e => e.EndDate).HasColumnName("end_date");
                entity.Property(e => e.IsActive).HasColumnName("is_active");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
            });

            // ============================================
            // SAVINGS GOALS TABLE
            // ============================================
            modelBuilder.Entity<SavingsGoal>(entity =>
            {
                entity.ToTable("savings_goals");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.TargetAmount).HasColumnName("target_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.CurrentAmount).HasColumnName("current_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.TargetDate).HasColumnName("target_date");
                entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(50).HasDefaultValue("medium");
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
                entity.Property(e => e.IsAchieved).HasColumnName("is_achieved").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
            });

            // ============================================
            // RECURRING BILLS TABLE
            // ============================================
            modelBuilder.Entity<RecurringBill>(entity =>
            {
                entity.ToTable("recurring_bills");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
                entity.Property(e => e.Frequency).HasColumnName("frequency").HasMaxLength(50).HasDefaultValue("monthly");
                entity.Property(e => e.DueDay).HasColumnName("due_day");
                entity.Property(e => e.NextDueDate).HasColumnName("next_due_date");
                entity.Property(e => e.AutoPay).HasColumnName("auto_pay").HasDefaultValue(false);
                entity.Property(e => e.ReminderDays).HasColumnName("reminder_days").HasDefaultValue(3);
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
            });

            // ============================================
            // REMINDER PREFERENCES TABLE
            // ============================================
            modelBuilder.Entity<ReminderPreferences>(entity =>
            {
                entity.ToTable("reminder_preferences");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").HasColumnType("uuid").IsRequired();
                entity.Property(e => e.EmailEnabled).HasColumnName("email_enabled");
                entity.Property(e => e.BillRemindersEnabled).HasColumnName("bill_reminders_enabled");
                entity.Property(e => e.BillReminderDays).HasColumnName("bill_reminder_days");
                entity.Property(e => e.LoanRemindersEnabled).HasColumnName("loan_reminders_enabled");
                entity.Property(e => e.LoanReminderDays).HasColumnName("loan_reminder_days");
                entity.Property(e => e.BudgetAlertsEnabled).HasColumnName("budget_alerts_enabled");
                entity.Property(e => e.BudgetAlertThreshold).HasColumnName("budget_alert_threshold").HasColumnType("decimal(5,2)");
                entity.Property(e => e.SavingsMilestonesEnabled).HasColumnName("savings_milestones_enabled");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId).IsUnique();
            });
        }
    }
}

