using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.AI.Core.Options;
using Paire.Modules.AI.Core.Services;
using Paire.Modules.AI.Infrastructure;

namespace Paire.Modules.AI;

public static class AiModule
{
    public static IServiceCollection AddAiModule(this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<AiDbContext>(options => options.UseNpgsql(conn));

        services.Configure<AiGatewayOptions>(configuration.GetSection(AiGatewayOptions.SectionName));
        services.Configure<RagServiceOptions>(configuration.GetSection(RagServiceOptions.SectionName));

        services.AddScoped<IConversationService, ConversationService>();
        services.AddScoped<ChatbotPersonalityService>();
        services.AddScoped<IChatbotService, ChatbotService>();
        services.AddScoped<IUserRagContextBuilder, ExpensesUserRagContextBuilder>();
        services.AddScoped<IRagContextService, RagContextService>();

        services.AddHttpClient<IAiGatewayClient, AiGatewayClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<AiGatewayOptions>>().Value;
            if (!string.IsNullOrEmpty(options.BaseUrl))
                client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        });
        services.AddHttpClient<IRagClient, RagClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<RagServiceOptions>>().Value;
            if (!string.IsNullOrEmpty(options.BaseUrl))
                client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        });

        return services;
    }
}
