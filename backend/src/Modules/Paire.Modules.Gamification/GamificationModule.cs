using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Gamification.Core.Interfaces;
using Paire.Modules.Gamification.Core.Services;
using Paire.Modules.Gamification.Infrastructure;

namespace Paire.Modules.Gamification;

public static class GamificationModule
{
    public static IServiceCollection AddGamificationModule(this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<GamificationDbContext>(options => options.UseNpgsql(conn));

        services.AddScoped<IPaireHomeService, PaireHomeService>();
        services.AddScoped<IChallengeService, ChallengeService>();

        return services;
    }
}
