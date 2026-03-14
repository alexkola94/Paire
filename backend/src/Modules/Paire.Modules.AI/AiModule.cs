using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.AI.Core.Options;
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

        return services;
    }
}
