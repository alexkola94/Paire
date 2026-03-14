namespace Paire.Shared.Infrastructure.Middleware;

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
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https:; " +
            "frame-ancestors 'none';";

        if (context.Request.IsHttps && context.Request.Host.Host != "localhost")
        {
            context.Response.Headers["Strict-Transport-Security"] =
                "max-age=31536000; includeSubDomains; preload";
        }

        context.Response.Headers["Permissions-Policy"] =
            "geolocation=(self), microphone=(), camera=()";

        await _next(context);
    }
}
