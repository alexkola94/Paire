using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Modules.Identity.Core.Services;
using Paire.Modules.Identity.Infrastructure;
using Paire.Shared.Kernel.Contracts;

namespace Paire.Modules.Identity;

public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["Database:ConnectionString"];

        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<IdentityDbContext>(options =>
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null)));
        }

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 12;
            options.Password.RequiredUniqueChars = 4;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = true;
            options.SignIn.RequireConfirmedAccount = true;
        })
        .AddEntityFrameworkStores<IdentityDbContext>()
        .AddDefaultTokenProviders();

        var jwtSettings = configuration.GetSection("JwtSettings");
        var jwtSecret = jwtSettings["Secret"];
        if (!string.IsNullOrEmpty(jwtSecret))
        {
            services.Configure<JwtSettings>(jwtSettings);
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.SaveToken = true;
                options.RequireHttpsMetadata = configuration["ASPNETCORE_ENVIRONMENT"] != "Development";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["JwtSettings:Issuer"] ?? "Codename_Shield",
                    ValidAudience = configuration["JwtSettings:Audience"] ?? "Codename_Shield_Clients",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    RoleClaimType = "roles"
                };
                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = ctx =>
                    {
                        ctx.HttpContext.RequestServices.GetRequiredService<ILogger<ShieldAuthService>>()
                            .LogError("Authentication Failed: {Message}", ctx.Exception.Message);
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async ctx =>
                    {
                        var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<ShieldAuthService>>();
                        var userSync = ctx.HttpContext.RequestServices.GetRequiredService<IUserSyncService>();
                        try
                        {
                            var user = ctx.Principal != null ? await userSync.SyncUserAsync(ctx.Principal) : null;
                            if (user != null)
                            {
                                var identity = ctx.Principal?.Identity as System.Security.Claims.ClaimsIdentity;
                                if (identity != null && !identity.HasClaim(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier))
                                    identity.AddClaim(new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id));
                            }
                        }
                        catch (Exception ex) { logger.LogError(ex, "Error in OnTokenValidated"); }
                    },
                    OnMessageReceived = ctx =>
                    {
                        var token = ctx.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(token) && ctx.Request.Path.StartsWithSegments("/hubs"))
                            ctx.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });
        }

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ITwoFactorAuthService, TwoFactorAuthService>();
        services.AddScoped<IUserSyncService, UserSyncService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IUsersService, UsersService>();
        services.AddScoped<IStreakService, StreakService>();
        services.AddScoped<Paire.Modules.Identity.Contracts.IUserProfileProvider, UserProfileProvider>();
        services.AddHttpClient<IShieldAuthService, ShieldAuthService>();
        services.AddTransient<ISessionValidator>(sp => (ISessionValidator)sp.GetRequiredService<IShieldAuthService>());

        return services;
    }
}
