using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Notifications.Contracts;
using Paire.Modules.Notifications.Core.Entities;
using Paire.Modules.Notifications.Infrastructure;

namespace Paire.Modules.Notifications.Core.Services;

public class ChatbotPersonalityProvider : IChatbotPersonalityProvider
{
    private readonly NotificationsDbContext _context;
    private readonly ILogger<ChatbotPersonalityProvider> _logger;

    public ChatbotPersonalityProvider(NotificationsDbContext context, ILogger<ChatbotPersonalityProvider> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<string> GetPersonalityAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var userGuid))
            return "supportive";

        var prefs = await _context.ReminderPreferences
            .AsNoTracking()
            .Where(p => p.UserId == userGuid)
            .Select(p => p.ChatbotPersonality)
            .FirstOrDefaultAsync();

        return !string.IsNullOrWhiteSpace(prefs) ? prefs : "supportive";
    }
}
