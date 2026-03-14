using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Partnership.Contracts;
using Paire.Modules.Partnership.Core.Interfaces;
using Paire.Modules.Partnership.Core.Services;
using Paire.Modules.Partnership.Infrastructure;

namespace Paire.Modules.Partnership;

public static class PartnershipModule
{
    public static IServiceCollection AddPartnershipModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["Database:ConnectionString"];

        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<PartnershipDbContext>(options =>
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null)));
        }

        services.AddScoped<IPartnershipService, PartnershipService>();
        services.AddScoped<IPartnershipResolver, PartnershipResolver>();

        return services;
    }
}
