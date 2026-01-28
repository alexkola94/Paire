namespace YouAndMeExpensesAPI.Middleware
{
    /// <summary>
    /// Middleware to add security headers to all responses
    /// Enhances application security by setting appropriate HTTP headers
    /// </summary>
    public class SecureHeadersMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SecureHeadersMiddleware> _logger;

        public SecureHeadersMiddleware(RequestDelegate next, ILogger<SecureHeadersMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Add security headers using indexer to avoid duplicate key exceptions
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            
            // Content Security Policy (adjust based on your needs)
            context.Response.Headers["Content-Security-Policy"] = 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' data:; " +
                "connect-src 'self' https:; " +
                "frame-ancestors 'none';";

            // Only add Strict-Transport-Security when using HTTPS (production)
            if (context.Request.IsHttps && context.Request.Host.Host != "localhost")
            {
                context.Response.Headers["Strict-Transport-Security"] = 
                    "max-age=31536000; includeSubDomains; preload";
            }

            // Permissions Policy (formerly Feature-Policy). Align with frontend: allow geolocation for same origin (Travel app).
            context.Response.Headers["Permissions-Policy"] = 
                "geolocation=(self), microphone=(), camera=()";

            await _next(context);
        }
    }
}

