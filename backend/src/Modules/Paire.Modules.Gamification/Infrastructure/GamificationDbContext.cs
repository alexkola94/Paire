using Microsoft.EntityFrameworkCore;
using Paire.Modules.Gamification.Core.Entities;

namespace Paire.Modules.Gamification.Infrastructure;

public class GamificationDbContext : DbContext
{
    public GamificationDbContext(DbContextOptions<GamificationDbContext> options) : base(options) { }

    public DbSet<PaireHome> PaireHomes { get; set; }
    public DbSet<HomeFurniture> HomeFurniture { get; set; }
    public DbSet<Challenge> Challenges { get; set; }
    public DbSet<UserChallenge> UserChallenges { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<PaireHome>().ToTable("paire_homes");
        modelBuilder.Entity<HomeFurniture>().ToTable("home_furniture");
        modelBuilder.Entity<Challenge>().ToTable("challenges");
        modelBuilder.Entity<UserChallenge>().ToTable("user_challenges")
            .HasOne(uc => uc.Challenge).WithMany().HasForeignKey(uc => uc.ChallengeId);
    }
}
