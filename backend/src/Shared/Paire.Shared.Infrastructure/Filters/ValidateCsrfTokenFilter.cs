using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Paire.Shared.Infrastructure.Filters;

public class ValidateCsrfTokenFilter : IAsyncAuthorizationFilter
{
    private static readonly string[] ExcludedPaths =
    {
        "/api/antiforgery/token",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/google",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/verify-email",
        "/api/auth/resend-verification",
        "/api/ai-gateway",
        "/api/chatbot",
        "/health",
        "/swagger",
        "/"
    };

    private static readonly HashSet<string> StateChangingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE"
    };

    private readonly IAntiforgery _antiforgery;

    public ValidateCsrfTokenFilter(IAntiforgery antiforgery)
    {
        _antiforgery = antiforgery;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var request = context.HttpContext.Request;
        var path = request.Path.Value ?? string.Empty;

        if (!StateChangingMethods.Contains(request.Method))
            return;

        if (ExcludedPaths.Any(excluded =>
        {
            var normalizedExcluded = excluded.TrimEnd('/');
            if (string.IsNullOrEmpty(normalizedExcluded)) return path == "/" || path == "";
            return path.StartsWith(normalizedExcluded, StringComparison.OrdinalIgnoreCase) ||
                   path.TrimEnd('/').Equals(normalizedExcluded, StringComparison.OrdinalIgnoreCase);
        }))
            return;

        var authHeader = request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return;

        try
        {
            await _antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            context.Result = new BadRequestObjectResult(new
            {
                error = "Invalid or missing CSRF token",
                message = "The request could not be validated. Please refresh the page and try again."
            });
        }
    }
}
