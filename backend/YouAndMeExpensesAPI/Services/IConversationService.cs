using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IConversationService
    {
        Task<List<Conversation>> GetConversationsAsync(string userId, bool includeArchived = false);
        Task<Conversation> GetOrCreateConversationAsync(string userId, Guid? conversationId = null, string? title = null);
        Task<Conversation?> GetConversationAsync(Guid conversationId, string userId);
        Task<List<ConversationMessage>> GetMessagesAsync(Guid conversationId, string userId, int page = 1, int pageSize = 50);
        Task<ConversationMessage> SaveMessageAsync(Guid conversationId, string role, string content, string messageType = "text");
        Task UpdateConversationTitleAsync(Guid conversationId, string userId, string title);
        Task ArchiveConversationAsync(Guid conversationId, string userId);
        Task DeleteConversationAsync(Guid conversationId, string userId);
        Task<List<ConversationMessage>> GetRecentContextAsync(Guid conversationId, int maxMessages = 10);
    }
}
