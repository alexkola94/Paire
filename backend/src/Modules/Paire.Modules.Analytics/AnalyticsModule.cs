using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Paire.Modules.Analytics.Core.Interfaces;
using Paire.Modules.Analytics.Core.Services;
using Paire.Modules.Analytics.Infrastructure;

namespace Paire.Modules.Analytics;

public static class AnalyticsModule
{
    public static IServiceCollection AddAnalyticsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AnalyticsDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IFinancialHealthService, FinancialHealthService>();
        services.AddScoped<IWeeklyRecapService, WeeklyRecapService>();
        services.AddScoped<IAchievementService, AchievementService>();
        services.AddScoped<IYearInReviewService, YearInReviewService>();

        services.AddHostedService<WeeklyRecapBackgroundService>();

        return services;
    }
}
