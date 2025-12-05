using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Base API controller with common authentication helpers
    /// </summary>
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Get the current authenticated user's ID from JWT claims
        /// </summary>
        /// <returns>User ID as string, or null if not authenticated</returns>
        protected string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        /// <summary>
        /// Get the current authenticated user's email from JWT claims
        /// </summary>
        /// <returns>User email as string, or null if not authenticated</returns>
        protected string? GetCurrentUserEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value;
        }

        /// <summary>
        /// Get the current authenticated user's display name from JWT claims
        /// </summary>
        /// <returns>User display name as string, or null if not authenticated</returns>
        protected string? GetCurrentUserName()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value;
        }

        /// <summary>
        /// Check if user is authenticated
        /// </summary>
        /// <returns>True if authenticated, false otherwise</returns>
        protected bool IsAuthenticated()
        {
            return User.Identity?.IsAuthenticated ?? false;
        }

        /// <summary>
        /// Verify user is authenticated and return user ID as Guid, or return Unauthorized response
        /// </summary>
        /// <returns>Tuple with (UserId as Guid, UnauthorizedResult or null)</returns>
        protected (Guid userId, IActionResult? error) GetAuthenticatedUser()
        {
            var userIdString = GetCurrentUserId();
            
            if (string.IsNullOrEmpty(userIdString))
            {
                return (Guid.Empty, Unauthorized(new { error = "User not authenticated" }));
            }

            if (!Guid.TryParse(userIdString, out var userId))
            {
                return (Guid.Empty, BadRequest(new { error = "Invalid user ID format" }));
            }

            return (userId, null);
        }
    }
}

