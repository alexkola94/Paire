using Microsoft.AspNetCore.Http;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Controllers;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for user profile management.
    /// Encapsulates all data access and storage logic used by ProfileController.
    /// </summary>
    public interface IProfileService
    {
        Task<UserProfile?> GetMyProfileAsync(Guid userId);
        Task<object?> GetProfileSummaryAsync(Guid requesterId, Guid profileId);
        Task<UserProfile?> UpdateMyProfileAsync(Guid userId, UpdateProfileRequest request);
        Task<UserProfile?> UpdateProfileAsync(Guid id, Guid userId, UpdateProfileRequest request);
        Task<string?> UploadAvatarAsync(Guid userId, IFormFile file);
    }
}

