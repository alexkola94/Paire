using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace YouAndMeExpensesAPI.Filters;

/// <summary>
/// Validates the anti-forgery (CSRF) token on state-changing HTTP methods (POST, PUT, PATCH, DELETE).
/// Excludes public and token endpoints so login, register, and token retrieval work without a token.
/// </summary>
public class ValidateCsrfTokenFilter : IAsyncAuthorizationFilter
{
    private static readonly string[] ExcludedPaths =
    {
        "/api/antiforgery/token",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/verify-email",
        "/api/auth/resend-verification",
        "/api/ai-gateway",   // AI chatbot proxy; JWT auth is sufficient
        "/api/chatbot",      // Rule-based chatbot and report generation
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

        // Only validate state-changing methods
        if (!StateChangingMethods.Contains(request.Method))
            return;

        // Skip excluded paths (antiforgery token, auth, health, Swagger)
        if (ExcludedPaths.Any(excluded =>
        {
            var normalizedExcluded = excluded.TrimEnd('/');
            if (string.IsNullOrEmpty(normalizedExcluded)) return path == "/" || path == "";
            return path.StartsWith(normalizedExcluded, StringComparison.OrdinalIgnoreCase) ||
                   path.TrimEnd('/').Equals(normalizedExcluded, StringComparison.OrdinalIgnoreCase);
        }))
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
