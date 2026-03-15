using Microsoft.EntityFrameworkCore;
using Paire.Modules.AI.Core.Entities;

namespace Paire.Modules.AI.Infrastructure;

public class AiDbContext : DbContext
{
    public AiDbContext(DbContextOptions<AiDbContext> options) : base(options) { }

    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ConversationMessage> ConversationMessages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Conversation>(e =>
        {
            e.ToTable("conversations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.LastMessageAt).HasColumnName("last_message_at");
            e.Property(x => x.MessageCount).HasColumnName("message_count");
            e.Property(x => x.Summary).HasColumnName("summary");
            e.Property(x => x.IsArchived).HasColumnName("is_archived");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.UserId);
        });
        modelBuilder.Entity<ConversationMessage>(e =>
        {
            e.ToTable("conversation_messages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ConversationId).HasColumnName("conversation_id");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.Content).HasColumnName("content");
            e.Property(x => x.MessageType).HasColumnName("message_type");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.ConversationId);
        });
    }
}
