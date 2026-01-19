using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Data
{
    /// <summary>
    /// Entity Framework DbContext for the application
    /// Uses PostgreSQL and ASP.NET Core Identity
    /// </summary>
    public class AppDbContext : IdentityDbContext<ApplicationUser>
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
        public DbSet<PartnershipInvitation> PartnershipInvitations { get; set; }
        public DbSet<Budget> Budgets { get; set; }
        public DbSet<SavingsGoal> SavingsGoals { get; set; }
        public DbSet<RecurringBill> RecurringBills { get; set; }
        public DbSet<RecurringBillAttachment> RecurringBillAttachments { get; set; }
        public DbSet<ReminderPreferences> ReminderPreferences { get; set; }
        public DbSet<ShoppingList> ShoppingLists { get; set; }
        public DbSet<ShoppingListItem> ShoppingListItems { get; set; }
        public DbSet<DataClearingRequest> DataClearingRequests { get; set; }
        public DbSet<BankConnection> BankConnections { get; set; }
        public DbSet<StoredBankAccount> BankAccounts { get; set; }
        public DbSet<UserSession> UserSessions { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<ImportHistory> ImportHistories { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        // Travel Mode DbSets
        public DbSet<Trip> Trips { get; set; }
        public DbSet<ItineraryEvent> ItineraryEvents { get; set; }
        public DbSet<PackingItem> PackingItems { get; set; }
        public DbSet<TravelDocument> TravelDocuments { get; set; }
        public DbSet<TravelExpense> TravelExpenses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ============================================
            // APPLICATION USER (AspNetUsers) CONFIGURATION
            // ============================================
            // Explicitly configure custom properties on ApplicationUser
            // to ensure they are properly tracked and saved
            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(e => e.DisplayName)
                    .HasMaxLength(255);
                entity.Property(e => e.AvatarUrl);
                entity.Property(e => e.CreatedAt);
                entity.Property(e => e.UpdatedAt);
                entity.Property(e => e.EmailNotificationsEnabled);
                entity.Property(e => e.EmailVerificationToken);
                entity.Property(e => e.PasswordResetToken);
                entity.Property(e => e.PasswordResetTokenExpires);
                entity.Property(e => e.TwoFactorSecret);
                entity.Property(e => e.BackupCodes);
            });

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
                entity.Property(e => e.BankTransactionId).HasColumnName("bank_transaction_id");
                entity.Property(e => e.BankAccountId).HasColumnName("bank_account_id");
                entity.Property(e => e.IsBankSynced).HasColumnName("is_bank_synced").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.BankTransactionId);
                entity.HasIndex(e => e.IsBankSynced);
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
            // PARTNERSHIP INVITATIONS TABLE
            // ============================================
            modelBuilder.Entity<PartnershipInvitation>(entity =>
            {
                entity.ToTable("partnership_invitations");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.InviterId).HasColumnName("inviter_id").IsRequired();
                entity.Property(e => e.InviteeEmail).HasColumnName("invitee_email").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Token).HasColumnName("token").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.AcceptedAt).HasColumnName("accepted_at");

                entity.HasIndex(e => e.InviterId);
                entity.HasIndex(e => e.InviteeEmail);
                entity.HasIndex(e => e.Token).IsUnique();
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
                entity.Property(e => e.Icon).HasColumnName("icon");
                entity.Property(e => e.Color).HasColumnName("color");
                entity.Property(e => e.Notes).HasColumnName("notes");
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
                // Note: IsActive is set in code, not via database default
                entity.Property(e => e.IsActive).HasColumnName("is_active");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
            });

            // ============================================
            // RECURRING BILL ATTACHMENTS TABLE
            // ============================================
            modelBuilder.Entity<RecurringBillAttachment>(entity =>
            {
                entity.ToTable("recurring_bill_attachments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.RecurringBillId).HasColumnName("recurring_bill_id").IsRequired();
                entity.Property(e => e.FileUrl).HasColumnName("file_url").IsRequired();
                entity.Property(e => e.FilePath).HasColumnName("file_path");
                entity.Property(e => e.FileName).HasColumnName("file_name");
                entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.RecurringBillId);

                // Foreign Key
                entity.HasOne(e => e.RecurringBill)
                    .WithMany(b => b.Attachments)
                    .HasForeignKey(e => e.RecurringBillId)
                    .OnDelete(DeleteBehavior.Cascade);
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
                entity.Property(e => e.PrivacyHideNumbers).HasColumnName("privacy_hide_numbers");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId).IsUnique();
            });

            // ============================================
            // SHOPPING LISTS TABLE
            // ============================================
            modelBuilder.Entity<ShoppingList>(entity =>
            {
                entity.ToTable("shopping_lists");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                // Convert string UserId to Guid for database (UUID column)
                entity.Property(e => e.UserId)
                    .HasColumnName("user_id")
                    .IsRequired()
                    .HasConversion(
                        v => Guid.Parse(v), // Convert string to Guid when storing
                        v => v.ToString()); // Convert Guid to string when reading
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Category).HasColumnName("category");
                entity.Property(e => e.IsCompleted).HasColumnName("is_completed").HasDefaultValue(false);
                entity.Property(e => e.CompletedDate).HasColumnName("completed_date");
                entity.Property(e => e.EstimatedTotal).HasColumnName("estimated_total").HasColumnType("decimal(18,2)");
                entity.Property(e => e.ActualTotal).HasColumnName("actual_total").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
            });

            // ============================================
            // SHOPPING LIST ITEMS TABLE
            // ============================================
            modelBuilder.Entity<ShoppingListItem>(entity =>
            {
                entity.ToTable("shopping_list_items");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.ShoppingListId).HasColumnName("shopping_list_id").IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").IsRequired();
                entity.Property(e => e.Quantity).HasColumnName("quantity").HasDefaultValue(1);
                entity.Property(e => e.Unit).HasColumnName("unit");
                entity.Property(e => e.EstimatedPrice).HasColumnName("estimated_price").HasColumnType("decimal(18,2)");
                entity.Property(e => e.ActualPrice).HasColumnName("actual_price").HasColumnType("decimal(18,2)");
                entity.Property(e => e.IsChecked).HasColumnName("is_checked").HasDefaultValue(false);
                entity.Property(e => e.Category).HasColumnName("category");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.ShoppingListId);
            });

            // ============================================
            // DATA CLEARING REQUESTS TABLE
            // ============================================
            modelBuilder.Entity<DataClearingRequest>(entity =>
            {
                entity.ToTable("data_clearing_requests");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.RequesterUserId).HasColumnName("requester_user_id").IsRequired();
                entity.Property(e => e.PartnerUserId).HasColumnName("partner_user_id");
                // Note: RequesterConfirmed and PartnerConfirmed are set in code, not via database defaults
                entity.Property(e => e.RequesterConfirmed).HasColumnName("requester_confirmed");
                entity.Property(e => e.PartnerConfirmed).HasColumnName("partner_confirmed");
                entity.Property(e => e.ConfirmationToken).HasColumnName("confirmation_token").HasMaxLength(255);
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("pending");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
                entity.Property(e => e.ExecutedAt).HasColumnName("executed_at");
                entity.Property(e => e.Notes).HasColumnName("notes");

                entity.HasIndex(e => e.RequesterUserId);
                entity.HasIndex(e => e.ConfirmationToken);
                entity.HasIndex(e => e.Status);
            });

            // ============================================
            // BANK CONNECTIONS TABLE
            // ============================================
            modelBuilder.Entity<BankConnection>(entity =>
            {
                entity.ToTable("bank_connections");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.AccessToken).HasColumnName("access_token").IsRequired();
                entity.Property(e => e.RefreshToken).HasColumnName("refresh_token");
                entity.Property(e => e.TokenExpiresAt).HasColumnName("token_expires_at");
                entity.Property(e => e.BankName).HasColumnName("bank_name");
                entity.Property(e => e.AccountIds).HasColumnName("account_ids");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.LastSyncAt).HasColumnName("last_sync_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
            });

            // ============================================
            // BANK ACCOUNTS TABLE
            // ============================================
            modelBuilder.Entity<StoredBankAccount>(entity =>
            {
                entity.ToTable("bank_accounts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.BankConnectionId).HasColumnName("bank_connection_id").IsRequired();
                entity.Property(e => e.AccountId).HasColumnName("account_id").IsRequired();
                entity.Property(e => e.Iban).HasColumnName("iban");
                entity.Property(e => e.AccountName).HasColumnName("account_name");
                entity.Property(e => e.AccountType).HasColumnName("account_type");
                entity.Property(e => e.Currency).HasColumnName("currency");
                entity.Property(e => e.BankName).HasColumnName("bank_name");
                entity.Property(e => e.CurrentBalance).HasColumnName("current_balance").HasColumnType("decimal(18,2)");
                entity.Property(e => e.LastBalanceUpdate).HasColumnName("last_balance_update");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.BankConnectionId);
                entity.HasIndex(e => e.AccountId);
                
                // Foreign key relationship
                entity.HasOne<BankConnection>()
                    .WithMany()
                    .HasForeignKey(e => e.BankConnectionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // USER SESSIONS TABLE
            // ============================================
            modelBuilder.Entity<UserSession>(entity =>
            {
                entity.ToTable("user_sessions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.TokenId).HasColumnName("token_id").HasMaxLength(255).IsRequired();
                entity.Property(e => e.RefreshTokenHash).HasColumnName("refresh_token_hash").HasMaxLength(255);
                entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
                entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
                entity.Property(e => e.LastAccessedAt).HasColumnName("last_accessed_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.TokenId).IsUnique();
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => e.ExpiresAt);
            });

            // ============================================
            // ACHIEVEMENTS TABLE
            // ============================================
            modelBuilder.Entity<Achievement>(entity =>
            {
                entity.ToTable("achievements");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(50);
                entity.Property(e => e.Icon).HasColumnName("icon").HasMaxLength(100);
                entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(50);
                entity.Property(e => e.Points).HasColumnName("points").HasDefaultValue(0);
                entity.Property(e => e.Rarity).HasColumnName("rarity").HasMaxLength(50).HasDefaultValue("common");
                entity.Property(e => e.CriteriaType).HasColumnName("criteria_type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.CriteriaValue).HasColumnName("criteria_value");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.Code).IsUnique();
                entity.HasIndex(e => e.Category);
                entity.HasIndex(e => e.IsActive);
            });

            // ============================================
            // USER ACHIEVEMENTS TABLE
            // ============================================
            modelBuilder.Entity<UserAchievement>(entity =>
            {
                entity.ToTable("user_achievements");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.AchievementId).HasColumnName("achievement_id").IsRequired();
                entity.Property(e => e.UnlockedAt).HasColumnName("unlocked_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Progress).HasColumnName("progress").HasColumnType("decimal(5,2)").HasDefaultValue(0);
                entity.Property(e => e.IsNotified).HasColumnName("is_notified").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.AchievementId);
                entity.HasIndex(e => new { e.UserId, e.AchievementId }).IsUnique(); // One achievement per user

                // Foreign key relationship
                entity.HasOne<Achievement>()
                    .WithMany()
                    .HasForeignKey(e => e.AchievementId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ============================================
            // IMPORT HISTORY TABLE
            // ============================================
            modelBuilder.Entity<ImportHistory>(entity =>
            {
                entity.ToTable("import_history");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(255);
                entity.Property(e => e.ImportDate).HasColumnName("import_date");
                entity.Property(e => e.TransactionCount).HasColumnName("transaction_count");
                entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ImportDate);
            });

            // ============================================
            // SYSTEM LOGS TABLE
            // ============================================
            modelBuilder.Entity<SystemLog>(entity =>
            {
                entity.ToTable("system_logs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Level).HasColumnName("level").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Message).HasColumnName("message").IsRequired();
                entity.Property(e => e.StackTrace).HasColumnName("stack_trace");
                entity.Property(e => e.Source).HasColumnName("source").HasMaxLength(255);
                entity.Property(e => e.Timestamp).HasColumnName("timestamp").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.Level);
                entity.HasIndex(e => e.Timestamp);
            });

            // ============================================
            // AUDIT LOGS TABLE
            // ============================================
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.ToTable("audit_logs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(450).IsRequired();
                entity.Property(e => e.Action).HasColumnName("action").HasMaxLength(100).IsRequired();
                entity.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(50);
                entity.Property(e => e.EntityId).HasColumnName("entity_id").HasMaxLength(450);
                entity.Property(e => e.Details).HasColumnName("details");
                entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
                entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
                entity.Property(e => e.Timestamp).HasColumnName("timestamp");
                entity.Property(e => e.Severity).HasColumnName("severity").HasMaxLength(20);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Action);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.EntityType);
            });

            // Configure Transaction -> ImportHistory relationship
            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.ImportHistory)
                .WithMany(h => h.Transactions)
                .HasForeignKey(t => t.ImportHistoryId)
                .OnDelete(DeleteBehavior.SetNull); // If history is deleted (reverted), we might want to cascade or handle manually. Revert logic should probably be manual delete of transaction.
                // Actually for "Revert" we want to delete transactions. But safe default for DB is SetNull or Restrict.
                // We'll handle deletion in the controller.

            // ============================================
            // TRIPS TABLE
            // ============================================
            modelBuilder.Entity<Trip>(entity =>
            {
                entity.ToTable("trips");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.Destination).HasColumnName("destination").HasMaxLength(255);
                entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100);
                entity.Property(e => e.Latitude).HasColumnName("latitude");
                entity.Property(e => e.Longitude).HasColumnName("longitude");
                entity.Property(e => e.StartDate).HasColumnName("start_date");
                entity.Property(e => e.EndDate).HasColumnName("end_date");
                entity.Property(e => e.Budget).HasColumnName("budget").HasColumnType("decimal(18,2)");
                entity.Property(e => e.BudgetCurrency).HasColumnName("budget_currency").HasMaxLength(10).HasDefaultValue("EUR");
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("planning");
                entity.Property(e => e.CoverImage).HasColumnName("cover_image");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.StartDate);
            });

            // ============================================
            // ITINERARY EVENTS TABLE
            // ============================================
            modelBuilder.Entity<ItineraryEvent>(entity =>
            {
                entity.ToTable("itinerary_events");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.TripId).HasColumnName("trip_id").IsRequired();
                entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).HasDefaultValue("activity");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.Date).HasColumnName("date");
                entity.Property(e => e.StartTime).HasColumnName("start_time").HasMaxLength(10);
                entity.Property(e => e.EndTime).HasColumnName("end_time").HasMaxLength(10);
                entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(255);
                entity.Property(e => e.Address).HasColumnName("address");
                entity.Property(e => e.Latitude).HasColumnName("latitude");
                entity.Property(e => e.Longitude).HasColumnName("longitude");
                entity.Property(e => e.ConfirmationNumber).HasColumnName("confirmation_number").HasMaxLength(100);
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.FlightNumber).HasColumnName("flight_number").HasMaxLength(20);
                entity.Property(e => e.Airline).HasColumnName("airline").HasMaxLength(100);
                entity.Property(e => e.DepartureAirport).HasColumnName("departure_airport").HasMaxLength(10);
                entity.Property(e => e.ArrivalAirport).HasColumnName("arrival_airport").HasMaxLength(10);
                entity.Property(e => e.CheckInTime).HasColumnName("check_in_time").HasMaxLength(10);
                entity.Property(e => e.CheckOutTime).HasColumnName("check_out_time").HasMaxLength(10);
                entity.Property(e => e.RoomType).HasColumnName("room_type").HasMaxLength(100);
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("confirmed");
                entity.Property(e => e.ReminderMinutes).HasColumnName("reminder_minutes");
                entity.Property(e => e.AttachmentUrl).HasColumnName("attachment_url");
                entity.Property(e => e.AttachmentName).HasColumnName("attachment_name").HasMaxLength(255);
                entity.Property(e => e.AttachmentType).HasColumnName("attachment_type").HasMaxLength(100);
                entity.Property(e => e.AttachmentSize).HasColumnName("attachment_size");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.TripId);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => new { e.TripId, e.Date });

                entity.HasOne(e => e.Trip)
                    .WithMany(t => t.ItineraryEvents)
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // PACKING ITEMS TABLE
            // ============================================
            modelBuilder.Entity<PackingItem>(entity =>
            {
                entity.ToTable("packing_items");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.TripId).HasColumnName("trip_id").IsRequired();
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(50).HasDefaultValue("other");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.Quantity).HasColumnName("quantity").HasDefaultValue(1);
                entity.Property(e => e.IsChecked).HasColumnName("is_checked").HasDefaultValue(false);
                entity.Property(e => e.IsEssential).HasColumnName("is_essential").HasDefaultValue(false);
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.TripId);
                entity.HasIndex(e => new { e.TripId, e.Category });

                entity.HasOne(e => e.Trip)
                    .WithMany(t => t.PackingItems)
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // TRAVEL DOCUMENTS TABLE
            // ============================================
            modelBuilder.Entity<TravelDocument>(entity =>
            {
                entity.ToTable("travel_documents");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.TripId).HasColumnName("trip_id").IsRequired();
                entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).HasDefaultValue("other");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
                entity.Property(e => e.DocumentNumber).HasColumnName("document_number").HasMaxLength(100);
                entity.Property(e => e.ExpiryDate).HasColumnName("expiry_date");
                entity.Property(e => e.IssueDate).HasColumnName("issue_date");
                entity.Property(e => e.IssuingCountry).HasColumnName("issuing_country").HasMaxLength(100);
                entity.Property(e => e.FileUrl).HasColumnName("file_url");
                entity.Property(e => e.FileThumbnail).HasColumnName("file_thumbnail");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.TripId);
                entity.HasIndex(e => new { e.TripId, e.Type });

                entity.HasOne(e => e.Trip)
                    .WithMany(t => t.Documents)
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // TRAVEL EXPENSES TABLE
            // ============================================
            modelBuilder.Entity<TravelExpense>(entity =>
            {
                entity.ToTable("travel_expenses");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.TripId).HasColumnName("trip_id").IsRequired();
                entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(50).HasDefaultValue("other");
                entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
                entity.Property(e => e.Currency).HasColumnName("currency").HasMaxLength(10).HasDefaultValue("EUR");
                entity.Property(e => e.AmountInBaseCurrency).HasColumnName("amount_in_base_currency").HasColumnType("decimal(18,2)");
                entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasColumnType("decimal(18,6)").HasDefaultValue(1);
                entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
                entity.Property(e => e.Date).HasColumnName("date");
                entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
                entity.Property(e => e.ReceiptUrl).HasColumnName("receipt_url");
                entity.Property(e => e.Notes).HasColumnName("notes");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasIndex(e => e.TripId);
                entity.HasIndex(e => e.Date);
                entity.HasIndex(e => new { e.TripId, e.Category });
                entity.HasIndex(e => new { e.TripId, e.Date });

                entity.HasOne(e => e.Trip)
                    .WithMany(t => t.Expenses)
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}

