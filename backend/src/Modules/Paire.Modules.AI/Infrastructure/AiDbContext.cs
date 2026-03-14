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
        modelBuilder.Entity<Conversation>().ToTable("conversations");
        modelBuilder.Entity<ConversationMessage>().ToTable("conversation_messages");
    }
}
