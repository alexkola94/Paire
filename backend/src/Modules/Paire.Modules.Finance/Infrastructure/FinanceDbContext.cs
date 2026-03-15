using Microsoft.EntityFrameworkCore;
using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Infrastructure;

public class FinanceDbContext : DbContext
{
    public FinanceDbContext(DbContextOptions<FinanceDbContext> options) : base(options) { }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Loan> Loans { get; set; }
    public DbSet<LoanPayment> LoanPayments { get; set; }
    public DbSet<Budget> Budgets { get; set; }
    public DbSet<SavingsGoal> SavingsGoals { get; set; }
    public DbSet<RecurringBill> RecurringBills { get; set; }
    public DbSet<RecurringBillAttachment> RecurringBillAttachments { get; set; }
    public DbSet<ImportHistory> ImportHistories { get; set; }
    public DbSet<UserProfileReadModel> UserProfiles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
        });

        modelBuilder.Entity<Loan>(entity =>
        {
            entity.ToTable("loans");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.InterestRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.InstallmentAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalPaid).HasColumnType("decimal(18,2)");
            entity.Property(e => e.RemainingAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<LoanPayment>(entity =>
        {
            entity.ToTable("loan_payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.PrincipalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.InterestAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.LoanId);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Budget>(entity =>
        {
            entity.ToTable("budgets");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnName("budgeted_amount").HasColumnType("decimal(18,2)");
            entity.Property(e => e.SpentAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<SavingsGoal>(entity =>
        {
            entity.ToTable("savings_goals");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TargetAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CurrentAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<RecurringBill>(entity =>
        {
            entity.ToTable("recurring_bills");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsActive);
        });

        modelBuilder.Entity<RecurringBillAttachment>(entity =>
        {
            entity.ToTable("recurring_bill_attachments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RecurringBillId);
            entity.HasOne(e => e.RecurringBill).WithMany(b => b.Attachments).HasForeignKey(e => e.RecurringBillId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ImportHistory>(entity =>
        {
            entity.ToTable("import_history");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Transaction>().HasOne(t => t.ImportHistory).WithMany(h => h.Transactions).HasForeignKey(t => t.ImportHistoryId).OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<UserProfileReadModel>(entity =>
        {
            entity.ToTable("user_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.DisplayName).HasColumnName("display_name");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
        });
    }
}
