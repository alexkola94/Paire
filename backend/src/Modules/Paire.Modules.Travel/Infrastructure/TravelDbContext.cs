using Paire.Modules.Travel.Core.Entities;

namespace Paire.Modules.Travel.Infrastructure;

public class TravelDbContext : DbContext
{
    public TravelDbContext(DbContextOptions<TravelDbContext> options) : base(options) { }

    public DbSet<Trip> Trips { get; set; } = null!;
    public DbSet<TripCity> TripCities { get; set; } = null!;
    public DbSet<ItineraryEvent> ItineraryEvents { get; set; } = null!;
    public DbSet<PackingItem> PackingItems { get; set; } = null!;
    public DbSet<TravelDocument> TravelDocuments { get; set; } = null!;
    public DbSet<TravelExpense> TravelExpenses { get; set; } = null!;
    public DbSet<TripLayoutPreferences> TripLayoutPreferences { get; set; } = null!;
    public DbSet<SavedPlace> SavedPlaces { get; set; } = null!;
    public DbSet<TravelNote> TravelNotes { get; set; } = null!;
    public DbSet<TravelNotificationPreferences> TravelNotificationPreferences { get; set; } = null!;
    public DbSet<PushSubscription> PushSubscriptions { get; set; } = null!;
    public DbSet<TravelNotification> TravelNotifications { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Trip>(entity =>
        {
            entity.HasMany(t => t.ItineraryEvents).WithOne(e => e.Trip).HasForeignKey(e => e.TripId);
            entity.HasMany(t => t.PackingItems).WithOne(p => p.Trip).HasForeignKey(p => p.TripId);
            entity.HasMany(t => t.Documents).WithOne(d => d.Trip).HasForeignKey(d => d.TripId);
            entity.HasMany(t => t.Expenses).WithOne(e => e.Trip).HasForeignKey(e => e.TripId);
            entity.HasMany(t => t.TravelNotes).WithOne(n => n.Trip).HasForeignKey(n => n.TripId);
            entity.HasMany(t => t.Cities).WithOne(c => c.Trip).HasForeignKey(c => c.TripId);
        });

        modelBuilder.Entity<TravelNotification>(entity =>
        {
            entity.Property(e => e.Type).HasConversion<string>();
        });
    }
}
