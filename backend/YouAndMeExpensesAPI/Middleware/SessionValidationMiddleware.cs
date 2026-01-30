using System.IdentityModel.Tokens.Jwt;
using YouAndMeExpensesAPI.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace YouAndMeExpensesAPI.Middleware
{
    /// <summary>
    /// Middleware to validate user sessions on each authenticated request
    /// Ensures that revoked sessions cannot be used
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

        public async Task InvokeAsync(HttpContext context, IShieldAuthService shieldAuthService)
        {
            // Skip validation for public endpoints
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // Skip OPTIONS requests (CORS preflight)
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

            // Check if user is authenticated
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                // Extract token from Authorization header
                var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    
                    try
                    {
                        var handler = new JwtSecurityTokenHandler();
                        var jwtToken = handler.ReadJwtToken(token);
                        
                        // Extract session_id claim
                        var sessionIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "session_id")?.Value;

                        if (!string.IsNullOrEmpty(sessionIdClaim))
                        {
                            // CACHE LOGIC START
                            var cacheKey = $"AuthSession:{sessionIdClaim}";
                            
                            // Try to get from cache (using generic extension method)
                            if (!_cache.TryGetValue(cacheKey, out bool isValid))
                            {
                                // Not in cache, validate via Shield API
                                isValid = await shieldAuthService.ValidateSessionAsync(sessionIdClaim);
                                
                                // Cache the result if valid
                                if (isValid)
                                {
                                    // SECURITY: Get cache duration from config or default to 1 minute (reduced from 10)
                                    // This ensures revoked sessions are detected faster after security incidents
                                    var cacheMinutes = _configuration.GetValue<int>("JwtSettings:SessionValidationCacheMinutes", 1);
                                    
                                    var cacheEntryOptions = new MemoryCacheEntryOptions
                                    {
                                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(cacheMinutes)
                                    };
                                    
                                    _cache.Set(cacheKey, true, cacheEntryOptions);
                                }
                            }

                            if (!isValid)
                            {
                                _logger.LogWarning($"Invalid or revoked session: {sessionIdClaim}");
                                context.Response.StatusCode = 401;
                                await context.Response.WriteAsJsonAsync(new { error = "Session expired or revoked. Please log in again." });
                                return;
                            }
                            // CACHE LOGIC END
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error validating session in middleware");
                        // Continue to next middleware - let JWT validation handle invalid tokens
                    }
                }
            }

            await _next(context);
        }
    }
}

