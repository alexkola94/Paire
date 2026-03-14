using Microsoft.EntityFrameworkCore;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Partnership.Core.Entities;

namespace Paire.Modules.Partnership.Infrastructure;

public class PartnershipDbContext : DbContext
{
    public PartnershipDbContext(DbContextOptions<PartnershipDbContext> options) : base(options) { }

    public DbSet<Core.Entities.Partnership> Partnerships { get; set; }
    public DbSet<PartnershipInvitation> PartnershipInvitations { get; set; }
    public DbSet<UserProfile> UserProfiles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Core.Entities.Partnership>(entity =>
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

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("user_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(255);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });
    }
}
