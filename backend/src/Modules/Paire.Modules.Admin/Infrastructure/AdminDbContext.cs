using Microsoft.EntityFrameworkCore;
using Paire.Modules.Admin.Core.Entities;

namespace Paire.Modules.Admin.Infrastructure;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

    public DbSet<SystemLog> SystemLogs { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<DataClearingRequest> DataClearingRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<SystemLog>().ToTable("system_logs");
        modelBuilder.Entity<AuditLog>().ToTable("audit_logs");
        modelBuilder.Entity<DataClearingRequest>().ToTable("data_clearing_requests");
    }
}
