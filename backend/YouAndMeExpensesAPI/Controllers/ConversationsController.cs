using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ConversationsController : BaseApiController
    {
        private readonly IConversationService _conversationService;
        private readonly ILogger<ConversationsController> _logger;

        public ConversationsController(IConversationService conversationService, ILogger<ConversationsController> logger)
        {
            _conversationService = conversationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetConversations([FromQuery] bool includeArchived = false)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var conversations = await _conversationService.GetConversationsAsync(userId.ToString(), includeArchived);
                return Ok(conversations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversations for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve conversations" });
            }
        }

        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var messages = await _conversationService.GetMessagesAsync(id, userId.ToString(), page, pageSize);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting messages for conversation {ConversationId}", id);
                return StatusCode(500, new { error = "Failed to retrieve messages" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest? request = null)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var conversation = await _conversationService.GetOrCreateConversationAsync(userId.ToString(), title: request?.Title);
                return Ok(conversation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating conversation for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to create conversation" });
            }
        }

        [HttpPut("{id}/title")]
        public async Task<IActionResult> UpdateTitle(Guid id, [FromBody] UpdateTitleRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                await _conversationService.UpdateConversationTitleAsync(id, userId.ToString(), request.Title);
                return Ok(new { message = "Title updated" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating conversation title");
                return StatusCode(500, new { error = "Failed to update title" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConversation(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                await _conversationService.DeleteConversationAsync(id, userId.ToString());
                return Ok(new { message = "Conversation deleted" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting conversation {ConversationId}", id);
                return StatusCode(500, new { error = "Failed to delete conversation" });
            }
        }

        [HttpPost("{id}/archive")]
        public async Task<IActionResult> ArchiveConversation(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                await _conversationService.ArchiveConversationAsync(id, userId.ToString());
                return Ok(new { message = "Conversation archived" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error archiving conversation {ConversationId}", id);
                return StatusCode(500, new { error = "Failed to archive conversation" });
            }
        }
    }

    public class CreateConversationRequest
    {
        public string? Title { get; set; }
    }

    public class UpdateTitleRequest
    {
        public string Title { get; set; } = string.Empty;
    }
}
