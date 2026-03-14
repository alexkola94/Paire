using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Admin.Infrastructure;

namespace Paire.Modules.Admin;

public static class AdminModule
{
    public static IServiceCollection AddAdminModule(this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<AdminDbContext>(options => options.UseNpgsql(conn));
        return services;
    }
}
