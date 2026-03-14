using Paire.Modules.Travel.Core.DTOs;

namespace Paire.Modules.Travel.Core.Interfaces;

public interface ITravelChatbotService
{
    Task<ChatbotResponse> ProcessQueryAsync(string userId, string query, List<ChatMessage>? history = null, string language = "en", TripContext? tripContext = null);
    Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en");
}
