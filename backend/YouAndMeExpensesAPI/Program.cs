using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text;
using System.Threading.RateLimiting;
using YouAndMeExpensesAPI.Configuration;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Filters;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.Repositories;
using YouAndMeExpensesAPI.Hubs;
using System;
using System.IO;
// Disable reload on change to avoid inotify limits on Render.com
// This MUST be set before CreateBuilder is called
System.Environment.SetEnvironmentVariable("DOTNET_hostBuilder:reloadConfigOnChange", "false");

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// Configure Services
// =====================================================

// Add Controllers with JSON options (camelCase for frontend compatibility) and CSRF validation filter
builder.Services.AddControllers(options => options.Filters.Add<ValidateCsrfTokenFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Anti-forgery (CSRF) protection: SPA sends token in X-CSRF-TOKEN header on state-changing requests
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest
        : Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
});

// Add SignalR
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Add API Explorer for Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Paire API",
        Version = "v1",
        Description = "Backend API for Paire - Personal Finance Management for Couples"
    });
    
    // Add JWT Bearer authentication to Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Rate limiting: global limit per IP to protect against abuse
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 2
        });
    });
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests",
            message = "Please try again later."
        }, cancellationToken);
    };
});

// Configure CORS
// Production frontend origins - always allowed in production so AI chatbot and API work from thepaire.org
var productionFrontendOrigins = new[] { "https://www.thepaire.org", "https://thepaire.org" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Get CORS origins from CORS_ORIGINS env/config, or AppSettings:FrontendUrl, or defaults
        var corsOriginsString = builder.Configuration["CORS_ORIGINS"]
            ?? builder.Configuration["AppSettings:FrontendUrl"];
        var corsOrigins = string.IsNullOrEmpty(corsOriginsString)
            ? new[]
            {
                "http://localhost:5173", // Vite default
                "http://localhost:3000", // Alternative
                "http://localhost:3001", // Alternative
                "http://localhost:3002",  // Alternative
                "http://192.168.14.18:3000",  // Your local IP
                "https://www.thepaire.org",
                "https://thepaire.org"
            }
            : corsOriginsString.Split(',', StringSplitOptions.RemoveEmptyEntries)
                               .Select(o => o.Trim())
                               .Where(o => !string.IsNullOrEmpty(o))
                               .ToArray();

        // In production: always include known frontend origins so CORS never blocks thepaire.org
        if (!builder.Environment.IsDevelopment())
        {
            corsOrigins = corsOrigins.Union(productionFrontendOrigins).Distinct().ToArray();
            if (corsOrigins.Length == 0)
                corsOrigins = productionFrontendOrigins;
        }

        // In development, allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (builder.Environment.IsDevelopment())
        {
            // Helper function to check if IP is in private range 172.16.0.0 - 172.31.255.255
            bool IsPrivateIPRange(string hostname)
            {
                if (hostname.StartsWith("172."))
                {
                    var parts = hostname.Split('.');
                    if (parts.Length >= 2 && int.TryParse(parts[1], out int secondOctet))
                    {
                        return secondOctet >= 16 && secondOctet <= 31;
                    }
                }
                return false;
            }

            policy.SetIsOriginAllowed(origin =>
            {
                // Allow configured origins
                if (corsOrigins.Contains(origin))
                    return true;

                // Allow localhost with any port
                if (origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase) || origin.StartsWith("https://localhost:", StringComparison.OrdinalIgnoreCase))
                    return true;

                // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) with common ports
                try
                {
                    var uri = new Uri(origin);
                    var hostname = uri.Host;
                    var port = uri.Port;
                    
                    // Check if it's a local network IP
                    if (hostname.StartsWith("192.168.") || 
                        hostname.StartsWith("10.") || 
                        (hostname.StartsWith("172.") && IsPrivateIPRange(hostname)))
                    {
                        // Allow common development ports (3000-3010, 5173, 5038, 5039)
                        return (port >= 3000 && port <= 3010) || port == 5173 || port == 5038 || port == 5039;
                    }
                }
                catch
                {
                    // Invalid URI, reject
                    return false;
                }

                return false;
            });
        }
        else
        {
            // In production: explicit origins only (productionFrontendOrigins already merged above)
            policy.WithOrigins(corsOrigins);
        }

        policy.AllowAnyMethod()
            .AllowAnyHeader();
        
        // Only allow credentials if we're using specific origins (not AllowAnyOrigin)
        if (corsOrigins.Length > 0 || builder.Environment.IsDevelopment())
        {
            policy.AllowCredentials();
        }
    });
});

// =====================================================
// Configure Entity Framework Core with PostgreSQL
// =====================================================

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? builder.Configuration["Database:ConnectionString"];

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Database connection string is missing. Please check appsettings.json");
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
    });
    
    // Enable sensitive data logging in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// =====================================================
// Configure Forwarded Headers for proxies (Render, Nginx, etc.)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear(); // Trust all networks/proxies (safe for Render)
    options.KnownProxies.Clear();
});

// Configure ASP.NET Core Identity
// =====================================================

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // SECURITY: Strengthened password requirements to prevent weak passwords
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;              // SECURITY: Now required
    options.Password.RequireNonAlphanumeric = true;        // SECURITY: Now required
    options.Password.RequiredLength = 12;                   // SECURITY: Increased from 6 to 12
    options.Password.RequiredUniqueChars = 4;              // SECURITY: Require 4 unique chars

    // Lockout settings - already properly configured
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.RequireUniqueEmail = true;
    
    // Sign-in settings
    options.SignIn.RequireConfirmedEmail = true;
    options.SignIn.RequireConfirmedAccount = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// =====================================================
// Configure JWT Authentication
// =====================================================

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["Secret"];

if (string.IsNullOrEmpty(jwtSecret))
{
    throw new InvalidOperationException("JWT Secret is missing. Please check appsettings.json");
}

builder.Services.Configure<JwtSettings>(jwtSettings);

// Metrics tracking (singleton to persist across requests)
builder.Services.AddSingleton<MetricsService>();

// Audit logging service
builder.Services.AddScoped<IAuditService, AuditService>();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ISessionService, SessionService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    // SECURITY: Require HTTPS metadata in production to prevent MITM attacks
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "Codename_Shield",
        ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "Codename_Shield_Clients",
        // SECURITY: No fallback secret - fail if not configured properly
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        RoleClaimType = "roles" // Map Shield's 'roles' claim to ASP.NET Identity Roles
    };
    
    // Configure SignalR authentication (token in query string)
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError("Authentication Failed: {Message}", context.Exception.Message);
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            var userSyncService = context.HttpContext.RequestServices.GetRequiredService<IUserSyncService>();

            try 
            {
                // Sync user (lookup by email/sub) to get local ID
                var user = context.Principal != null ? await userSyncService.SyncUserAsync(context.Principal) : null;

                if (user != null)
                {
                    var identity = context.Principal?.Identity as System.Security.Claims.ClaimsIdentity;
                    if (identity != null && !identity.HasClaim(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier))
                    {
                        identity.AddClaim(new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id));
                        logger.LogInformation("Enriched Principal with Local User ID: {UserId}", user.Id);
                    }
                }
                else
                {
                    logger.LogWarning("UserSyncService failed to resolve user for Principal: {Name}", context.Principal?.Identity?.Name);
                    // context.Fail("User synchronization failed"); // Optional: Fail strictly?
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in OnTokenValidated during User Sync");
            }
        },
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            // If the request is for our hub...
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/hubs")))
            {
                // Read the token out of the query string
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// =====================================================
// Register Data Service (Entity Framework)
// =====================================================

// In-memory cache used by admin/maintenance features
builder.Services.AddMemoryCache();

builder.Services.AddScoped<ISupabaseService, EntityFrameworkDataService>();

// =====================================================
// Configure Email Settings
// =====================================================

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
// Use HttpClient for EmailService (switching from SMTP to Resend API)
builder.Services.AddHttpClient<IEmailService, EmailService>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// =====================================================
// Configure Reminder Services
// =====================================================

builder.Services.AddScoped<IReminderService, ReminderService>();
builder.Services.AddScoped<ITravelNotificationService, TravelNotificationService>();

// Register Analytics Service
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

// Register Chatbot Service
builder.Services.AddScoped<IChatbotService, ChatbotService>();

// Register Travel Chatbot Service (Travel Guide)
builder.Services.AddScoped<ITravelChatbotService, TravelChatbotService>();

// Register Report Generation Service (for chatbot file downloads)
builder.Services.AddScoped<IReportGenerationService, ReportGenerationService>();

// Register Two-Factor Authentication Service
builder.Services.AddScoped<ITwoFactorAuthService, TwoFactorAuthService>();

// Register Shield Auth Proxy Service
builder.Services.AddHttpClient<IShieldAuthService, ShieldAuthService>();

// AI Gateway (optional plug-and-play AI Microservice)
builder.Services.Configure<AiGatewayOptions>(builder.Configuration.GetSection(AiGatewayOptions.SectionName));
builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>(client => client.Timeout = TimeSpan.FromSeconds(120));
builder.Services.Configure<RagServiceOptions>(builder.Configuration.GetSection(RagServiceOptions.SectionName));
builder.Services.AddHttpClient<IRagClient, RagClient>(client => client.Timeout = TimeSpan.FromSeconds(120));

// RAG User Context Services - enables per-user financial context for "Thinking mode" AI chat
// ExpensesUserRagContextBuilder: builds financial summary from analytics, bills, savings for RAG indexing
// RagContextService: orchestrates lazy sync - only updates RAG when context is missing or stale
builder.Services.AddScoped<IUserRagContextBuilder, ExpensesUserRagContextBuilder>();
builder.Services.AddScoped<IRagContextService, RagContextService>();
builder.Services.AddScoped<IUserSyncService, UserSyncService>();

// Register Achievement Service
builder.Services.AddScoped<IAchievementService, AchievementService>();

// Register Job Monitor Service (Singleton)
builder.Services.AddSingleton<JobMonitorService>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// Register Budget Service
builder.Services.AddScoped<IBudgetService, BudgetService>();

// Register Bank Transaction Import Service
builder.Services.AddScoped<IBankTransactionImportService, BankTransactionImportService>();

// Register CSV Import Service
builder.Services.AddScoped<IBankStatementImportService, BankStatementImportService>();


// Register Bank Transaction Import Service
// Register Bank Transaction Import Service
builder.Services.AddScoped<IBankTransactionImportService, BankTransactionImportService>();

// Register Storage Service (Supabase)
builder.Services.AddScoped<IStorageService, SupabaseStorageService>();

// Register Transactions Service
builder.Services.AddScoped<ITransactionsService, TransactionsService>();

// Register Loans Service
builder.Services.AddScoped<ILoansService, LoansService>();
builder.Services.AddScoped<ILoanPaymentsService, LoanPaymentsService>();
builder.Services.AddScoped<IRecurringBillsService, RecurringBillsService>();
builder.Services.AddScoped<ISavingsGoalsService, SavingsGoalsService>();
builder.Services.AddScoped<IImportsService, ImportsService>();
// Register Budgets application service
builder.Services.AddScoped<IBudgetsAppService, BudgetsAppService>();
builder.Services.AddScoped<IShoppingListsService, ShoppingListsService>();
builder.Services.AddScoped<IDataClearingService, DataClearingService>();
builder.Services.AddScoped<ISystemService, SystemService>();
builder.Services.AddScoped<IPublicStatsService, PublicStatsService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// =====================================================
// Register Travel Services & Repository
// =====================================================

builder.Services.AddScoped<ITravelRepository, TravelRepository>();
builder.Services.AddScoped<ITravelService, TravelService>();
builder.Services.AddScoped<ITravelAttachmentService, TravelAttachmentService>();

builder.Services.AddHttpClient<ITravelGeocodingService, TravelGeocodingService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

builder.Services.AddHttpClient<ITravelAdvisoryService, TravelAdvisoryService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});


// =====================================================
// Register Greece Economic Data Service
// =====================================================

// Register HTTP client for Greece Economic Data API calls
builder.Services.AddHttpClient<IGreeceEconomicDataService, GreeceEconomicDataService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Register Currency Service
builder.Services.AddHttpClient<ICurrencyService, CurrencyService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Register Profile Service
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IUsersService, UsersService>();
builder.Services.AddScoped<IPartnershipService, PartnershipService>();

// Explicitly register generic HttpClient for proxies
builder.Services.AddHttpClient();

// =====================================================
// Configure Background Services (Optional - Uncomment to enable)
// =====================================================

// Enable daily reminder checks at 9 AM
builder.Services.AddHostedService<ReminderBackgroundService>();

// Enable hourly travel notification checks
builder.Services.AddHostedService<TravelNotificationBackgroundService>();

// Uncomment the line below to enable automatic bank transaction sync every 6 hours
// builder.Services.AddHostedService<BankTransactionSyncBackgroundService>();

// Enable Real-time Monitoring Background Service
builder.Services.AddHostedService<MonitoringBackgroundService>();

// =====================================================
// Build the Application
// =====================================================

var app = builder.Build();

// =====================================================
// Configure HTTP Request Pipeline
// =====================================================

// Enable Swagger in Development only (disable in production for security)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Paire API v1");
        options.RoutePrefix = string.Empty; // Swagger UI at root
    });
}

// Enable CORS
app.UseCors("AllowFrontend");

// Rate limiting (per IP)
app.UseRateLimiter();

// Log all requests (including production) to debug issues
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var method = context.Request.Method;
    var path = context.Request.Path;

    try
    {
        await next();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error processing request: {Method} {Path}", method, path);
        throw;
    }
});

// Secure headers middleware (add security headers to all responses)
app.UseMiddleware<YouAndMeExpensesAPI.Middleware.SecureHeadersMiddleware>();

// Metrics tracking middleware (tracks request timing)
app.UseMiddleware<YouAndMeExpensesAPI.Middleware.MetricsMiddleware>();

// Enable Forwarded Headers (MUST be before HttpsRedirection)
app.UseForwardedHeaders();

// Enable HTTPS Redirection (only in production)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Enable Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

// Session validation middleware (must be AFTER Authorization to access User claims)
app.UseMiddleware<YouAndMeExpensesAPI.Middleware.SessionValidationMiddleware>();

// Map Controllers
app.MapControllers();
app.MapHub<MonitoringHub>("/hubs/monitoring");

// CSRF token endpoint: SPA calls this with credentials to get the request token and set the antiforgery cookie
app.MapGet("/api/antiforgery/token", (IAntiforgery antiforgery, HttpContext context) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    return Results.Ok(new { token = tokens.RequestToken });
}).AllowAnonymous();

// Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "1.0.0",
    services = new
    {
        database = "connected",
        email = "configured",
        authentication = "active"
    }
}))
.WithName("HealthCheck")
.WithOpenApi();

// Diagnostic Endpoint (Minimal API) - Added directly here to bypass any controller routing issues
app.MapGet("/diagnostics/email", async (ILogger<Program> logger, Microsoft.Extensions.Options.IOptions<EmailSettings> emailSettings) =>
{
    var results = new Dictionary<string, string>();
    var logs = new List<string>();

    void Log(string message)
    {
        logger.LogInformation(message);
        logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] {message}");
    }

    var settings = emailSettings.Value;
    
    try
    {
        var resendApiHost = "api.resend.com";
        Log($"🔍 Starting Connectivity Test for {resendApiHost} (HTTP Mode)...");

        // 1. DNS Resolution
        Log($"1️⃣ Testing DNS Resolution for {resendApiHost}...");
        try
        {
            var addresses = await System.Net.Dns.GetHostAddressesAsync(resendApiHost);
            foreach (var addr in addresses)
            {
                Log($"   Found IP: {addr} ({addr.AddressFamily})");
            }
            results["DNS"] = "✅ Success";
        }
        catch (Exception ex)
        {
            Log($"❌ DNS Lookup Failed: {ex.Message}");
            results["DNS"] = "❌ Failed";
        }

        // 2. HTTP Connectivity Test to Resend API (Since we switched to HTTP)
        Log($"2️⃣ Testing HTTPS Connect to {resendApiHost}...");
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            
            // Just test if we can reach the server (Resend root returns 404 or similar, but proves connectivity)
            var response = await client.GetAsync("https://api.resend.com");
            
            Log($"   ✅ HTTPS Connection Successful (Status: {response.StatusCode})");
            results["HTTPS-API"] = "✅ Success";
        }
        catch (Exception ex)
        {
            Log($"   ❌ HTTPS Connection Failed: {ex.Message}");
            results["HTTPS-API"] = "❌ Failed";
        }

        return Results.Ok(new
        {
            status = "Completed",
            results,
            logs
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message, title: "Error running diagnostics");
    }
})
.WithName("EmailDiagnostics")
.WithOpenApi();

// =====================================================
// Initialize Application Data
// =====================================================

// Initialize default achievements on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var achievementService = scope.ServiceProvider.GetRequiredService<IAchievementService>();
        await achievementService.InitializeDefaultAchievementsAsync();
        app.Logger.LogInformation("Default achievements initialized successfully");
    }
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Error initializing default achievements");
    // Don't fail startup if achievements initialization fails
}

// =====================================================
// Run the Application
// =====================================================

app.Logger.LogInformation("Paire API is starting...");
app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");
app.Logger.LogInformation("Swagger UI available at: http://localhost:5000");

app.Run();

// Make Program class public for testing
public partial class Program { }
