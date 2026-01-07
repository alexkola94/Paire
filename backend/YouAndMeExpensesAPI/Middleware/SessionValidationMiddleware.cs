using System.IdentityModel.Tokens.Jwt;
using YouAndMeExpensesAPI.Services;

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

        public SessionValidationMiddleware(RequestDelegate next, ILogger<SessionValidationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
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
                            // Validate session via Shield API
                            var isValid = await shieldAuthService.ValidateSessionAsync(sessionIdClaim);
                            
                            if (!isValid)
                            {
                                _logger.LogWarning($"Invalid or revoked session: {sessionIdClaim}");
                                context.Response.StatusCode = 401;
                                await context.Response.WriteAsJsonAsync(new { error = "Session expired or revoked. Please log in again." });
                                return;
                            }
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

