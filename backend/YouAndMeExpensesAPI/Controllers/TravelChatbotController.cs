using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Travel Guide chatbot API controller.
    /// Provides rule-based travel assistance (packing, budget, itinerary, etc.).
    /// </summary>
    [Route("api/travel-chatbot")]
    public class TravelChatbotController : BaseApiController
    {
        private readonly ITravelChatbotService _travelChatbotService;
        private readonly ILogger<TravelChatbotController> _logger;

        public TravelChatbotController(
            ITravelChatbotService travelChatbotService,
            ILogger<TravelChatbotController> logger)
        {
            _travelChatbotService = travelChatbotService;
            _logger = logger;
        }

        /// <summary>
        /// Process a travel chatbot query.
        /// </summary>
        /// <param name="request">Query with message, optional history, and language.</param>
        /// <returns>Structured ChatbotResponse (message, type, quickActions, actionLink).</returns>
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
                var response = await _travelChatbotService.ProcessQueryAsync(userId.ToString(), request.Query, request.History, language, request.TripContext);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing travel chatbot query for user {UserId}", userId);
                return StatusCode(500, new { message = "Error processing query", error = ex.Message });
            }
        }

        /// <summary>
        /// Get suggested travel questions for the given language.
        /// </summary>
        /// <param name="language">Language code (en, el, es, fr).</param>
        /// <returns>List of suggested question strings.</returns>
        [HttpGet("suggestions")]
        public async Task<IActionResult> GetSuggestions([FromQuery] string? language = "en")
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var suggestions = await _travelChatbotService.GetSuggestedQuestionsAsync(userId.ToString(), language ?? "en");
                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting travel chatbot suggestions for user {UserId}", userId);
                return StatusCode(500, new { message = "Error getting suggestions", error = ex.Message });
            }
        }
    }
}
