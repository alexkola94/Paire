using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for AI Chatbot service
    /// Provides intelligent responses to financial queries
    /// </summary>
    public interface IChatbotService
    {
        Task<ChatbotResponse> ProcessQueryAsync(string userId, string query, List<ChatMessage>? history = null);
        Task<List<string>> GetSuggestedQuestionsAsync(string userId);
    }
}

