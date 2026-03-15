using Microsoft.EntityFrameworkCore;
using Paire.Modules.AI.Core.DTOs;
using Paire.Modules.AI.Core.Entities;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.AI.Infrastructure;

namespace Paire.Modules.AI.Core.Services;

public class ConversationService : IConversationService
{
    private readonly AiDbContext _db;

    public ConversationService(AiDbContext db)
    {
        _db = db;
    }

    public async Task<Conversation> GetOrCreateConversationAsync(string userId, Guid? conversationId, CancellationToken cancellationToken = default)
    {
        if (conversationId.HasValue)
        {
            var existing = await _db.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId.Value && c.UserId == userId, cancellationToken);
            if (existing != null)
                return existing;
        }

        var conv = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = "New conversation",
            MessageCount = 0,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Conversations.Add(conv);
        await _db.SaveChangesAsync(cancellationToken);
        return conv;
    }

    public async Task<List<ChatMessageDto>> GetRecentContextAsync(Guid conversationId, int count, CancellationToken cancellationToken = default)
    {
        var messages = await _db.ConversationMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(count)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return messages.Select(m => new ChatMessageDto
        {
            Role = m.Role == "assistant" ? "bot" : m.Role,
            Content = m.Content
        }).ToList();
    }

    public async Task SaveMessageAsync(Guid conversationId, string role, string content, CancellationToken cancellationToken = default)
    {
        var conv = await _db.Conversations.FindAsync(new object[] { conversationId }, cancellationToken);
        if (conv == null) return;

        var msg = new ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Role = role,
            Content = content,
            MessageType = "text",
            CreatedAt = DateTime.UtcNow
        };
        _db.ConversationMessages.Add(msg);

        conv.MessageCount++;
        conv.LastMessageAt = DateTime.UtcNow;
        conv.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}
