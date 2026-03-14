using System.Security.Claims;
using Paire.Modules.Identity.Core.Entities;

namespace Paire.Modules.Identity.Core.Interfaces
{
    public interface IUserSyncService
    {
        /// <summary>
        /// Synchronizes the local Shadow User and Profile with the provided claims.
        /// </summary>
        Task<ApplicationUser?> SyncUserAsync(ClaimsPrincipal principal);

        /// <summary>
        /// Synchronizes the local Shadow User and Profile with explicit data (e.g. from Register response).
        /// </summary>
        Task<ApplicationUser?> SyncUserExplicitAsync(string userId, string email, string displayName);

        /// <summary>
        /// Creates a new user from Google sign-in (no password). Used when no existing user with this email.
        /// </summary>
        Task<ApplicationUser?> SyncUserFromGoogleAsync(string email, string? displayName);
    }
}
