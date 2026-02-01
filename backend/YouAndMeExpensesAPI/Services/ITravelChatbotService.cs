using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for Travel Guide chatbot service.
    /// Provides rule-based responses for travel-related queries (packing, weather, budget, etc.).
    /// </summary>
    public interface ITravelChatbotService
    {
        /// <summary>
        /// Process a travel-related query and return a structured response.
        /// </summary>
        /// <param name="userId">Current user ID (for future personalization, e.g. trip context).</param>
        /// <param name="query">User message.</param>
        /// <param name="history">Conversation history for context.</param>
        /// <param name="language">Language code (en, el, es, fr).</param>
        /// <param name="tripContext">Optional active trip context from frontend (destination, dates, budget) for personalized responses.</param>
        /// <returns>ChatbotResponse with message, type, optional quick actions and action link.</returns>
        Task<ChatbotResponse> ProcessQueryAsync(string userId, string query, List<ChatMessage>? history = null, string language = "en", TripContext? tripContext = null);

        /// <summary>
        /// Get suggested travel questions for the given language.
        /// </summary>
        /// <param name="userId">Current user ID (reserved for future use).</param>
        /// <param name="language">Language code (en, el, es, fr).</param>
        /// <returns>List of suggested question strings.</returns>
        Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en");
    }
}
