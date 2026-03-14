using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Paire.Shared.Kernel.Api;

public abstract class BaseApiController : ControllerBase
{
    protected string? GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("uid")?.Value;
    }

    protected string? GetCurrentUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
    }

    protected string? GetCurrentUserName()
    {
        return User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value;
    }

    protected bool IsAuthenticated()
    {
        return User.Identity?.IsAuthenticated ?? false;
    }

    protected (Guid userId, IActionResult? error) GetAuthenticatedUser()
    {
        var userIdString = GetCurrentUserId();

        if (string.IsNullOrEmpty(userIdString))
        {
            return (Guid.Empty, Unauthorized(new { error = "User not authenticated" }));
        }

        if (!Guid.TryParse(userIdString, out var userId))
        {
            return (Guid.Empty, BadRequest(new { error = $"Invalid user ID format: {userIdString}" }));
        }

        return (userId, null);
    }
}
