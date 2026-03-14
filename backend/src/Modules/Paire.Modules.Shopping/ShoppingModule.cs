using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Shopping.Core.Interfaces;
using Paire.Modules.Shopping.Core.Services;
using Paire.Modules.Shopping.Infrastructure;

namespace Paire.Modules.Shopping;

public static class ShoppingModule
{
    public static IServiceCollection AddShoppingModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ShoppingDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IShoppingListsService, ShoppingListsService>();

        return services;
    }
}
