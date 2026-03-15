using Microsoft.EntityFrameworkCore;
using Paire.Modules.Banking.Core.Entities;

namespace Paire.Modules.Banking.Infrastructure;

public class BankingDbContext : DbContext
{
    public BankingDbContext(DbContextOptions<BankingDbContext> options) : base(options) { }

    public DbSet<BankConnection> BankConnections { get; set; }
    public DbSet<StoredBankAccount> BankAccounts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<BankConnection>(entity =>
        {
            entity.ToTable("bank_connections");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.AccessToken).HasColumnName("access_token");
            entity.Property(e => e.RefreshToken).HasColumnName("refresh_token");
            entity.Property(e => e.TokenExpiresAt).HasColumnName("token_expires_at");
            entity.Property(e => e.BankName).HasColumnName("bank_name");
            entity.Property(e => e.AccountIds).HasColumnName("account_ids");
            entity.Property(e => e.ConsentId).HasColumnName("consent_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LastSyncAt).HasColumnName("last_sync_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });
        modelBuilder.Entity<StoredBankAccount>(entity =>
        {
            entity.ToTable("bank_accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.BankConnectionId).HasColumnName("bank_connection_id");
            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.Iban).HasColumnName("iban");
            entity.Property(e => e.AccountName).HasColumnName("account_name");
            entity.Property(e => e.AccountType).HasColumnName("account_type");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.BankName).HasColumnName("bank_name");
            entity.Property(e => e.CurrentBalance).HasColumnName("current_balance");
            entity.Property(e => e.LastBalanceUpdate).HasColumnName("last_balance_update");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });
    }
}
