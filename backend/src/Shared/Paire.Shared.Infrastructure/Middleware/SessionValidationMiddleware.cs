using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Paire.Shared.Kernel.Contracts;

namespace Paire.Shared.Infrastructure.Middleware;

/// <summary>
/// Middleware to validate user sessions on each authenticated request.
/// Ensures that revoked sessions cannot be used.
/// </summary>
public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SessionValidationMiddleware> _logger;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;

    public SessionValidationMiddleware(
        RequestDelegate next,
        ILogger<SessionValidationMiddleware> logger,
        IMemoryCache cache,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _cache = cache;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, ISessionValidator sessionValidator)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        if (context.Request.Method == "OPTIONS")
        {
            await _next(context);
            return;
        }

        if (path.StartsWith("/api/auth/login") ||
            path.StartsWith("/api/auth/register") ||
            path.StartsWith("/api/auth/forgot-password") ||
            path.StartsWith("/api/auth/reset-password") ||
            path.StartsWith("/api/auth/confirm-email") ||
            path.StartsWith("/api/auth/resend-confirmation") ||
            path.StartsWith("/swagger") ||
            path.StartsWith("/health"))
        {
            await _next(context);
            return;
        }

        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jwtToken = handler.ReadJwtToken(token);
                    var sessionIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "session_id")?.Value;

                    if (!string.IsNullOrEmpty(sessionIdClaim))
                    {
                        var cacheKey = $"AuthSession:{sessionIdClaim}";
                        if (!_cache.TryGetValue(cacheKey, out bool isValid))
                        {
                            isValid = await sessionValidator.ValidateSessionAsync(sessionIdClaim);
                            if (isValid)
                            {
                                var cacheMinutes = _configuration.GetValue<int>("JwtSettings:SessionValidationCacheMinutes", 1);
                                _cache.Set(cacheKey, true, new MemoryCacheEntryOptions
                                {
                                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(cacheMinutes)
                                });
                            }
                        }

                        if (!isValid)
                        {
                            _logger.LogWarning("Invalid or revoked session: {SessionId}", sessionIdClaim);
                            context.Response.StatusCode = 401;
                            await context.Response.WriteAsJsonAsync(new { error = "Session expired or revoked. Please log in again." });
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error validating session in middleware");
                }
            }
        }

        await _next(context);
    }
}
