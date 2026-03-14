using Microsoft.EntityFrameworkCore;
using Paire.Modules.Shopping.Core.Entities;

namespace Paire.Modules.Shopping.Infrastructure;

public class ShoppingDbContext : DbContext
{
    public ShoppingDbContext(DbContextOptions<ShoppingDbContext> options) : base(options) { }

    public DbSet<ShoppingList> ShoppingLists { get; set; }
    public DbSet<ShoppingListItem> ShoppingListItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ShoppingList>(entity =>
        {
            entity.ToTable("shopping_lists");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(500).IsRequired();
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
            entity.Property(e => e.IsCompleted).HasColumnName("is_completed").HasDefaultValue(false);
            entity.Property(e => e.CompletedDate).HasColumnName("completed_date");
            entity.Property(e => e.EstimatedTotal).HasColumnName("estimated_total").HasColumnType("decimal(18,2)");
            entity.Property(e => e.ActualTotal).HasColumnName("actual_total").HasColumnType("decimal(18,2)");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<ShoppingListItem>(entity =>
        {
            entity.ToTable("shopping_list_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ShoppingListId).HasColumnName("shopping_list_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(500).IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasDefaultValue(1);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50);
            entity.Property(e => e.EstimatedPrice).HasColumnName("estimated_price").HasColumnType("decimal(18,2)");
            entity.Property(e => e.ActualPrice).HasColumnName("actual_price").HasColumnType("decimal(18,2)");
            entity.Property(e => e.IsChecked).HasColumnName("is_checked").HasDefaultValue(false);
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.ShoppingListId);
        });
    }
}
