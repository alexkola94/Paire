namespace Paire.Modules.Notifications.Contracts;

/// <summary>
/// Cross-module contract for retrieving user's chatbot personality preference.
/// Used by AI module to personalize responses.
/// </summary>
public interface IChatbotPersonalityProvider
{
    Task<string> GetPersonalityAsync(string userId);
}
