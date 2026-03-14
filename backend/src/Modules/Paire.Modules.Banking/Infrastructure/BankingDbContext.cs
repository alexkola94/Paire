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
        modelBuilder.Entity<BankConnection>().ToTable("bank_connections");
        modelBuilder.Entity<StoredBankAccount>().ToTable("bank_accounts");
    }
}
