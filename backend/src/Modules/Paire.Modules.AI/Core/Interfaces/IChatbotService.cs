using Paire.Modules.AI.Core.DTOs;

namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Rule-based financial chatbot service.
/// </summary>
public interface IChatbotService
{
    Task<ChatbotResponseDto> ProcessQueryAsync(string userId, string query, List<ChatMessageDto>? history, string language = "en", CancellationToken cancellationToken = default);
    Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en", CancellationToken cancellationToken = default);
}
