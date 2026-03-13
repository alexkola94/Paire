using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class ConversationService : IConversationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ConversationService> _logger;

        public ConversationService(AppDbContext context, ILogger<ConversationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<Conversation>> GetConversationsAsync(string userId, bool includeArchived = false)
        {
            var query = _context.Conversations
                .Where(c => c.UserId == userId);

            if (!includeArchived)
                query = query.Where(c => !c.IsArchived);

            return await query
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Take(50)
                .ToListAsync();
        }

        public async Task<Conversation> GetOrCreateConversationAsync(string userId, Guid? conversationId = null, string? title = null)
        {
            if (conversationId.HasValue && conversationId.Value != Guid.Empty)
            {
                var existing = await _context.Conversations
                    .FirstOrDefaultAsync(c => c.Id == conversationId.Value && c.UserId == userId && !c.IsArchived);
                if (existing != null) return existing;
            }

            var conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title ?? "New Conversation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created conversation {ConversationId} for user {UserId}", conversation.Id, userId);
            return conversation;
        }

        public async Task<Conversation?> GetConversationAsync(Guid conversationId, string userId)
        {
            return await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        }

        public async Task<List<ConversationMessage>> GetMessagesAsync(Guid conversationId, string userId, int page = 1, int pageSize = 50)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

            if (conversation == null) return new List<ConversationMessage>();

            return await _context.ConversationMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<ConversationMessage> SaveMessageAsync(Guid conversationId, string role, string content, string messageType = "text")
        {
            var message = new ConversationMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                Role = role,
                Content = content,
                MessageType = messageType,
                CreatedAt = DateTime.UtcNow
            };

            _context.ConversationMessages.Add(message);

            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation != null)
            {
                conversation.LastMessageAt = DateTime.UtcNow;
                conversation.MessageCount++;
                conversation.UpdatedAt = DateTime.UtcNow;

                if (role == "user" && conversation.MessageCount <= 2 && conversation.Title == "New Conversation")
                {
                    conversation.Title = content.Length > 60 ? content[..57] + "..." : content;
                }
            }

            await _context.SaveChangesAsync();
            return message;
        }

        public async Task UpdateConversationTitleAsync(Guid conversationId, string userId, string title)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
            if (conversation == null) return;

            conversation.Title = title;
            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task ArchiveConversationAsync(Guid conversationId, string userId)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
            if (conversation == null) return;

            conversation.IsArchived = true;
            conversation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteConversationAsync(Guid conversationId, string userId)
        {
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
            if (conversation == null) return;

            var messages = await _context.ConversationMessages
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync();

            _context.ConversationMessages.RemoveRange(messages);
            _context.Conversations.Remove(conversation);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted conversation {ConversationId} for user {UserId}", conversationId, userId);
        }

        public async Task<List<ConversationMessage>> GetRecentContextAsync(Guid conversationId, int maxMessages = 10)
        {
            return await _context.ConversationMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.CreatedAt)
                .Take(maxMessages)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }
    }
}
