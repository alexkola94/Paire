using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Shared.Infrastructure.Email;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Shared.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));
        services.AddHttpClient<IEmailService, EmailService>(client =>
        {
            client.BaseAddress = new Uri("https://api.resend.com");
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        services.AddScoped<IStorageService, SupabaseStorageService>();
        services.AddSingleton<IJobMonitorService, JobMonitorService>();
        return services;
    }
}
