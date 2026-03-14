using Microsoft.AspNetCore.Http;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Identity.Api.Controllers;

namespace Paire.Modules.Identity.Core.Interfaces
{
    /// <summary>
    /// Domain service for user profile management.
    /// Encapsulates all data access and storage logic used by ProfileController.
    /// </summary>
    public interface IProfileService
    {
        /// <summary>
        /// Gets the current user's profile in API shape (snake_case) for GET /api/profile.
        /// </summary>
        Task<object?> GetMyProfileForApiAsync(Guid userId);
        Task<UserProfile?> GetMyProfileAsync(Guid userId);
        Task<object?> GetProfileSummaryAsync(Guid requesterId, Guid profileId);
        Task<UserProfile?> UpdateMyProfileAsync(Guid userId, UpdateProfileRequest request);
        Task<UserProfile?> UpdateProfileAsync(Guid id, Guid userId, UpdateProfileRequest request);
        Task<string?> UploadAvatarAsync(Guid userId, IFormFile file);
    }
}
