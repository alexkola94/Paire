using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.HttpOverrides;
using Paire.Shared.Infrastructure;
using Paire.Shared.Infrastructure.Filters;
using Paire.Shared.Infrastructure.Logging;
using Paire.Shared.Infrastructure.Middleware;
using Paire.Shared.Infrastructure.Services;
using Paire.Modules.Identity;
using Paire.Modules.Finance;
using Paire.Modules.Partnership;
using Paire.Modules.Travel;
using Paire.Modules.Shopping;
using Paire.Modules.Analytics;
using Paire.Modules.AI;
using Paire.Modules.Gamification;
using Paire.Modules.Notifications;
using Paire.Modules.Banking;
using Paire.Modules.Admin;

System.Environment.SetEnvironmentVariable("DOTNET_hostBuilder:reloadConfigOnChange", "false");

if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")))
    Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");

var builder = WebApplication.CreateBuilder(args);

// Logging
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Information);
if (builder.Environment.IsDevelopment())
    builder.Logging.AddFilter("Paire", LogLevel.Debug);

var logsBasePath = builder.Configuration["Logging:File:BasePath"]
                   ?? Path.Combine(AppContext.BaseDirectory, "Logs");
var fileMinLevel = builder.Environment.IsDevelopment() ? LogLevel.Debug : LogLevel.Warning;
builder.Logging.AddDailyFileLogger(logsBasePath, builder.Environment.EnvironmentName, fileMinLevel);

// Antiforgery (CSRF)
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest
        : Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration["CORS_ORIGINS"] ?? builder.Configuration["AppSettings:FrontendUrl"];
        var corsOrigins = string.IsNullOrEmpty(origins)
            ? new[] { "http://localhost:5173", "http://localhost:3000", "https://www.thepaire.org", "https://thepaire.org" }
            : origins.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(o => o.Trim()).ToArray();
        if (builder.Environment.IsDevelopment())
            policy.SetIsOriginAllowed(_ => true);
        else
            policy.WithOrigins(corsOrigins);
        policy.AllowAnyMethod().AllowAnyHeader().AllowCredentials();
    });
});

// Controllers + CSRF filter
builder.Services.AddControllers(options => options.Filters.Add<ValidateCsrfTokenFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// MediatR
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Identity.Contracts.IIdentityModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Finance.Contracts.IFinanceModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Partnership.Contracts.IPartnershipModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Travel.Contracts.ITravelModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Shopping.Contracts.IShoppingModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Analytics.Contracts.IAnalyticsModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.AI.Contracts.IAiModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Gamification.Contracts.IGamificationModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Notifications.Contracts.INotificationsModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Banking.Contracts.IBankingModule>();
    cfg.RegisterServicesFromAssemblyContaining<Paire.Modules.Admin.Contracts.IAdminModule>();
});

// Shared infrastructure (Email, Storage)
builder.Services.AddSharedInfrastructure(builder.Configuration);
builder.Services.AddSingleton<MetricsService>();
builder.Services.AddMemoryCache();

// Forwarded headers for proxies
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Register all domain modules
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddFinanceModule(builder.Configuration);
builder.Services.AddPartnershipModule(builder.Configuration);
builder.Services.AddTravelModule(builder.Configuration);
builder.Services.AddShoppingModule(builder.Configuration);
builder.Services.AddAnalyticsModule(builder.Configuration);
builder.Services.AddAiModule(builder.Configuration);
builder.Services.AddGamificationModule(builder.Configuration);
builder.Services.AddNotificationsModule(builder.Configuration);
builder.Services.AddBankingModule(builder.Configuration);
builder.Services.AddAdminModule(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseMiddleware<SecureHeadersMiddleware>();
app.UseMiddleware<MetricsMiddleware>();

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<SessionValidationMiddleware>();

app.MapControllers();
app.MapHub<Paire.Modules.Admin.Api.Hubs.MonitoringHub>("/hubs/monitoring");

app.MapGet("/api/antiforgery/token", (IAntiforgery antiforgery, HttpContext context) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    return Results.Ok(new { token = tokens.RequestToken });
}).AllowAnonymous();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "2.2.0"
}));

app.MapGet("/api/system/warmup", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

app.MapGet("/api/system/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "2.3.0"
})).AllowAnonymous();

app.Logger.LogInformation("Paire API (Modular Monolith) is starting...");
app.Logger.LogInformation("Environment: {Environment}", app.Environment.EnvironmentName);

app.Run();

public partial class Program { }
