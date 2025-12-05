using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// Configure Services
// =====================================================

// Add Controllers with JSON options (camelCase for frontend compatibility)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
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
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Get CORS origins from environment variable or use defaults
        var corsOriginsString = builder.Configuration["CORS_ORIGINS"];
        var corsOrigins = string.IsNullOrEmpty(corsOriginsString)
            ? new[]
            {
                "http://localhost:5173", // Vite default
                "http://localhost:3000", // Alternative
                "http://localhost:3001", // Alternative
                "http://localhost:3002",  // Alternative
                "http://192.168.14.18:3000"  // Your local IP
            }
            : corsOriginsString.Split(',', StringSplitOptions.RemoveEmptyEntries)
                               .Select(o => o.Trim())
                               .ToArray();

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
                if (origin.StartsWith("http://localhost:") || origin.StartsWith("https://localhost:"))
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
                        // Allow common development ports (3000-3010, 5173, 5038)
                        return (port >= 3000 && port <= 3010) || port == 5173 || port == 5038;
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
            // In production, only allow configured origins
            policy.WithOrigins(corsOrigins);
        }

        policy.AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
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
// Configure ASP.NET Core Identity
// =====================================================

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;

    // Lockout settings
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
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false; // Set to true in production
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };
    
    // Note: By default, JWT Bearer middleware validates tokens when present
    // and populates User claims, even without [Authorize] attribute.
    // [Authorize] only requires authentication, but doesn't prevent token validation.
});

builder.Services.AddAuthorization();

// =====================================================
// Register Data Service (Entity Framework)
// =====================================================

builder.Services.AddScoped<ISupabaseService, EntityFrameworkDataService>();

// =====================================================
// Configure Email Settings
// =====================================================

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

// =====================================================
// Configure Reminder Services
// =====================================================

builder.Services.AddScoped<IReminderService, ReminderService>();

// Register Analytics Service
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

// Register Chatbot Service
builder.Services.AddScoped<IChatbotService, ChatbotService>();

// Register Two-Factor Authentication Service
builder.Services.AddScoped<ITwoFactorAuthService, TwoFactorAuthService>();

// =====================================================
// Configure Background Services (Optional - Uncomment to enable)
// =====================================================

// Uncomment the line below to enable daily reminder checks at 9 AM
// builder.Services.AddHostedService<ReminderBackgroundService>();

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

// Enable HTTPS Redirection (only in production)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Enable Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

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

// =====================================================
// Run the Application
// =====================================================

app.Logger.LogInformation("Paire API is starting...");
app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");
app.Logger.LogInformation("Swagger UI available at: http://localhost:5000");

app.Run();

// Make Program class public for testing
public partial class Program { }
