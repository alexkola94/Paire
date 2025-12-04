using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// Configure Services
// =====================================================

// Add Controllers
builder.Services.AddControllers();

// Add API Explorer for Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "You & Me Expenses API",
        Version = "v1",
        Description = "Backend API for You & Me Expenses - Personal Finance Management"
    });
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173", // Vite default
            "http://localhost:3000", // Alternative
            "http://localhost:3001", // Alternative
            "http://localhost:3002", // Alternative
            "https://yourusername.github.io" // GitHub Pages
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// =====================================================
// Configure Supabase
// =====================================================

builder.Services.AddSingleton<Supabase.Client>(sp =>
{
    var supabaseUrl = builder.Configuration["Supabase:Url"];
    var supabaseKey = builder.Configuration["Supabase:AnonKey"];
    
    if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
    {
        throw new InvalidOperationException("Supabase configuration is missing. Please check appsettings.json");
    }

    var options = new Supabase.SupabaseOptions
    {
        AutoRefreshToken = true,
        AutoConnectRealtime = true
    };

    return new Supabase.Client(supabaseUrl, supabaseKey, options);
});

// Register Data Service (Using Entity Framework instead of Supabase SDK)
builder.Services.AddScoped<ISupabaseService, EntityFrameworkDataService>();

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

// Register Chatbot Service (temporarily disabled - needs EF migration)
// builder.Services.AddScoped<IChatbotService, ChatbotService>();

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

// Enable Swagger in Development and Production (you can restrict this if needed)
if (app.Environment.IsDevelopment() || true) // Change 'true' to specific condition for production
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "You & Me Expenses API v1");
        options.RoutePrefix = string.Empty; // Swagger UI at root
    });
}

// Enable CORS
app.UseCors("AllowFrontend");

// Enable HTTPS Redirection
app.UseHttpsRedirection();

// Enable Authorization (if needed in future)
// app.UseAuthorization();

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
        supabase = "connected",
        email = "configured",
        reminders = "active"
    }
}))
.WithName("HealthCheck")
.WithOpenApi();

// =====================================================
// Run the Application
// =====================================================

app.Logger.LogInformation("You & Me Expenses API is starting...");
app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");
app.Logger.LogInformation("Swagger UI available at: http://localhost:5000");

app.Run();

// Make Program class public for testing
public partial class Program { }
