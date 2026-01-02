using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Shield.Client.Integration;

public static class ShieldAuthExtensions
{
    /// <summary>
    /// Adds Shield Authentication (JWT) to the service collection.
    /// Requires "JwtSettings" section in appsettings.json.
    /// </summary>
    public static IServiceCollection AddShieldAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("JwtSettings");
        var secret = section["Secret"] ?? throw new ArgumentNullException("JwtSettings:Secret is missing in appsettings.json");
        var issuer = section["Issuer"] ?? "Codename_Shield";   // Default match
        var audience = section["Audience"] ?? "SenseiHub_Ecosystem"; // Default match

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false; // Set to true in prod
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = issuer,

                ValidateAudience = true,
                ValidAudience = audience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),

                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        return services;
    }
}
