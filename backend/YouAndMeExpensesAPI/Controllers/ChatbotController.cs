using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Chatbot API Controller
    /// Provides intelligent financial assistant capabilities
    /// </summary>
    [Route("api/[controller]")]
    public class ChatbotController : BaseApiController
    {
        private readonly IChatbotService _chatbotService;
        private readonly ILogger<ChatbotController> _logger;

        public ChatbotController(IChatbotService chatbotService, ILogger<ChatbotController> logger)
        {
            _chatbotService = chatbotService;
            _logger = logger;
        }

        /// <summary>
        /// Process a chatbot query
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <param name="request">Chatbot query request</param>
        /// <returns>Chatbot response</returns>
        [HttpPost("query")]
        public async Task<IActionResult> ProcessQuery([FromBody] ChatbotQuery request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest(new { message = "Query cannot be empty" });
            }

            try
            {
                var language = request.Language ?? "en";
                var response = await _chatbotService.ProcessQueryAsync(userId.ToString(), request.Query, request.History, language);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chatbot query for user {UserId}", userId);
                return StatusCode(500, new { message = "Error processing query", error = ex.Message });
            }
        }

        /// <summary>
        /// Get suggested questions for the user
        /// </summary>
        /// <param name="userId">User ID from auth</param>
        /// <returns>List of suggested questions</returns>
        [HttpGet("suggestions")]
        public async Task<IActionResult> GetSuggestions([FromQuery] string? language = "en")
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var suggestions = await _chatbotService.GetSuggestedQuestionsAsync(userId.ToString(), language ?? "en");
                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting chatbot suggestions for user {UserId}", userId);
                return StatusCode(500, new { message = "Error getting suggestions", error = ex.Message });
            }
        }
    }
}

