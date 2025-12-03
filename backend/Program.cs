using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ============================================
// Service Configuration
// ============================================

// Add CORS policy for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "https://youandme-expenses.github.io")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Add controllers
builder.Services.AddControllers();

// Add API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "You & Me Expenses API", 
        Version = "v1",
        Description = "API for managing couple expenses, income, and loans"
    });
});

// Configure JWT Authentication (optional - Supabase handles auth)
// Uncomment if you want to add backend JWT validation
/*
var supabaseJwtSecret = builder.Configuration["Supabase:JwtSecret"];
if (!string.IsNullOrEmpty(supabaseJwtSecret))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(supabaseJwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false
            };
        });
}
*/

var app = builder.Build();

// ============================================
// Middleware Pipeline
// ============================================

// Enable Swagger in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "You & Me Expenses API v1");
        c.RoutePrefix = string.Empty; // Swagger at root
    });
}

// Enable HTTPS redirection
app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowFrontend");

// Enable authentication & authorization (if configured)
// app.UseAuthentication();
// app.UseAuthorization();

// Map controllers
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new 
{ 
    status = "healthy", 
    timestamp = DateTime.UtcNow,
    version = "1.0.0"
}))
.WithName("HealthCheck")
.WithTags("System");

// ============================================
// Start Application
// ============================================

app.Run();

