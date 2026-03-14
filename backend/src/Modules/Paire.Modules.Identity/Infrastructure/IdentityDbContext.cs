using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Paire.Modules.Identity.Core.Entities;

namespace Paire.Modules.Identity.Infrastructure;

public class IdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<UserSession> UserSessions { get; set; }
    public DbSet<UserStreak> UserStreaks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(e => e.DisplayName).HasMaxLength(255);
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

        modelBuilder.Entity<UserStreak>(entity =>
        {
            entity.ToTable("user_streaks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.StreakType).HasColumnName("streak_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.CurrentStreak).HasColumnName("current_streak").HasDefaultValue(0);
            entity.Property(e => e.LongestStreak).HasColumnName("longest_streak").HasDefaultValue(0);
            entity.Property(e => e.LastActivityDate).HasColumnName("last_activity_date");
            entity.Property(e => e.TotalPoints).HasColumnName("total_points").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.StreakType }).IsUnique();
        });
    }
}
