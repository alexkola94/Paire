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
            // Add security headers
            context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Add("X-Frame-Options", "DENY");
            context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
            context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
            
            // Content Security Policy (adjust based on your needs)
            context.Response.Headers.Add("Content-Security-Policy", 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' data:; " +
                "connect-src 'self' https:; " +
                "frame-ancestors 'none';");

            // Only add Strict-Transport-Security when using HTTPS (production)
            if (context.Request.IsHttps && context.Request.Host.Host != "localhost")
            {
                context.Response.Headers.Add("Strict-Transport-Security", 
                    "max-age=31536000; includeSubDomains; preload");
            }

            // Permissions Policy (formerly Feature-Policy)
            context.Response.Headers.Add("Permissions-Policy", 
                "geolocation=(), microphone=(), camera=()");

            await _next(context);
        }
    }
}

