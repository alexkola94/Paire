using Paire.Modules.AI.Core.Entities;
using Paire.Modules.AI.Core.DTOs;

namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Service for chatbot conversation and message persistence (AiDbContext).
/// </summary>
public interface IConversationService
{
    Task<Conversation> GetOrCreateConversationAsync(string userId, Guid? conversationId, CancellationToken cancellationToken = default);
    Task<List<ChatMessageDto>> GetRecentContextAsync(Guid conversationId, int count, CancellationToken cancellationToken = default);
    Task SaveMessageAsync(Guid conversationId, string role, string content, CancellationToken cancellationToken = default);
}
