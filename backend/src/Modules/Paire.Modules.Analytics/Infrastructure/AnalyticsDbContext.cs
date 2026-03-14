using Microsoft.EntityFrameworkCore;
using Paire.Modules.Analytics.Core.Entities;

namespace Paire.Modules.Analytics.Infrastructure;

public class AnalyticsDbContext : DbContext
{
    public AnalyticsDbContext(DbContextOptions<AnalyticsDbContext> options) : base(options) { }

    public DbSet<FinancialHealthScore> FinancialHealthScores { get; set; }
    public DbSet<WeeklyRecap> WeeklyRecaps { get; set; }
    public DbSet<Achievement> Achievements { get; set; }
    public DbSet<UserAchievement> UserAchievements { get; set; }
    public DbSet<YearReview> YearReviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FinancialHealthScore>(entity =>
        {
            entity.ToTable("financial_health_scores");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.Period });
        });

        modelBuilder.Entity<WeeklyRecap>(entity =>
        {
            entity.ToTable("weekly_recaps");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Achievement>(entity =>
        {
            entity.ToTable("achievements");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        modelBuilder.Entity<UserAchievement>(entity =>
        {
            entity.ToTable("user_achievements");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.AchievementId }).IsUnique();
        });

        modelBuilder.Entity<YearReview>(entity =>
        {
            entity.ToTable("year_reviews");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.Year });
        });
    }
}
