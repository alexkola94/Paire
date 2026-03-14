using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Travel.Core.Interfaces;
using Paire.Modules.Travel.Core.Services;
using Paire.Modules.Travel.Infrastructure;

namespace Paire.Modules.Travel;

public static class TravelModule
{
    public static IServiceCollection AddTravelModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["Database:ConnectionString"];

        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<TravelDbContext>(options =>
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null)));
        }

        services.AddScoped<ITravelRepository, TravelRepository>();
        services.AddScoped<ITravelService, TravelService>();
        services.AddScoped<ITravelNotificationService, TravelNotificationService>();
        services.AddScoped<ITravelChatbotService, TravelChatbotService>();
        services.AddScoped<ITravelAttachmentService, TravelAttachmentService>();
        services.AddHttpClient<ITravelGeocodingService, TravelGeocodingService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });
        services.AddHttpClient<ITravelAdvisoryService, TravelAdvisoryService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        return services;
    }
}
