using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace YouAndMeExpensesAPI.Filters;

/// <summary>
/// Validates the anti-forgery (CSRF) token on state-changing HTTP methods (POST, PUT, PATCH, DELETE).
/// Excludes public and token endpoints so login, register, and token retrieval work without a token.
/// Skips validation when the request carries a Bearer (JWT) token: JWT is not sent automatically
/// by the browser on cross-site requests, so CSRF does not apply. This allows the SPA (e.g. on
/// a different port or origin) to perform CRUD without the antiforgery cookie being sent.
/// CSRF is still enforced for any state-changing request that does not use Bearer auth.
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

        // Skip CSRF when authenticated with Bearer (JWT). Standard practice: CSRF protects
        // cookie-based sessions; Bearer tokens are not auto-sent by the browser, so no CSRF risk.
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
