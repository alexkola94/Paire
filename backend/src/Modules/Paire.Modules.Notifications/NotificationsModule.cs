using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Notifications.Contracts;
using Paire.Modules.Notifications.Core.Background;
using Paire.Modules.Notifications.Core.Interfaces;
using Paire.Modules.Notifications.Core.Services;
using Paire.Modules.Notifications.Infrastructure;

namespace Paire.Modules.Notifications;

public static class NotificationsModule
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("Notifications") ?? configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<NotificationsDbContext>(options => options.UseNpgsql(conn));

        services.AddScoped<IReminderService, ReminderService>();
        services.AddScoped<IChatbotPersonalityProvider, ChatbotPersonalityProvider>();

        services.AddHostedService<ReminderBackgroundService>();

        return services;
    }
}
