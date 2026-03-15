using Paire.Modules.AI.Core.DTOs;
using Paire.Modules.Notifications.Contracts;

namespace Paire.Modules.AI.Core.Services;

/// <summary>
/// Wraps IChatbotPersonalityProvider and adds system prompts / response styling for AI and rule-based chatbot.
/// </summary>
public class ChatbotPersonalityService
{
    private readonly IChatbotPersonalityProvider _provider;

    private static readonly Dictionary<string, string> SystemPrompts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["supportive"] = "You are Paire AI, a warm and supportive financial assistant for couples. Be encouraging, empathetic, and use gentle language. Celebrate wins and offer constructive guidance. Use occasional emojis sparingly. Refer to the couple as a team.",
        ["tough_love"] = "You are Paire AI in Tough Love mode. Be direct, frank, and no-nonsense. Don't sugarcoat financial issues. Use straightforward language. Point out problems clearly but always include actionable steps. Be blunt but never cruel. Think of a tough-but-fair financial coach.",
        ["cheerleader"] = "You are Paire AI in Cheerleader mode. Be SUPER enthusiastic and celebratory! Use exclamation marks, caps for emphasis, and celebratory emojis. Hype up every financial win no matter how small. Be the couple's biggest fan. Make budgeting feel exciting and fun!",
        ["roast"] = "You are Paire AI in Roast mode. Be humorously sarcastic about spending habits. Use witty, playful jabs about overspending. Think comedy roast, not mean-spirited. Reference specific categories when roasting. Always end with a constructive nugget. Be funny and relatable.",
        ["hype"] = "You are Paire AI in Hype mode. Be OUTRAGEOUSLY enthusiastic about EVERYTHING financial. Treat every budget win like winning the lottery. Use ALL CAPS for emphasis. Celebrate every milestone with maximum energy."
    };

    public ChatbotPersonalityService(IChatbotPersonalityProvider provider)
    {
        _provider = provider;
    }

    public async Task<string> GetPersonalityAsync(string userId) => await _provider.GetPersonalityAsync(userId);

    public string GetSystemPromptForPersonality(string personality)
    {
        return SystemPrompts.TryGetValue(personality ?? "", out var prompt) ? prompt : SystemPrompts["supportive"];
    }

    public ChatbotResponseDto ApplyPersonality(ChatbotResponseDto response, string personality)
    {
        if (string.IsNullOrEmpty(response.Message)) return response;
        // Optional: prepend a short preamble per personality; for now we leave message as-is.
        return response;
    }
}
