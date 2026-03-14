using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Banking.Core.Interfaces;
using Paire.Modules.Banking.Core.Services;
using Paire.Modules.Banking.Infrastructure;
using Paire.Modules.Finance.Core.Interfaces;

namespace Paire.Modules.Banking;

public static class BankingModule
{
    public static IServiceCollection AddBankingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var conn = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<BankingDbContext>(options => options.UseNpgsql(conn));

        services.AddScoped<IBankTransactionImportService, BankTransactionImportService>();
        services.AddScoped<IEnableBankingService, EnableBankingService>();

        services.AddHostedService<BankTransactionSyncBackgroundService>();

        return services;
    }
}
