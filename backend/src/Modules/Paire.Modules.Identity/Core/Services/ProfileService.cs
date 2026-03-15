using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Paire.Modules.Identity.Api.Controllers;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Modules.Identity.Infrastructure;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Modules.Identity.Core.Services
{
    /// <summary>
    /// Concrete implementation of <see cref="IProfileService"/> that handles
    /// all profile reads/updates and avatar uploads.
    /// </summary>
    public class ProfileService : IProfileService
    {
        // TODO: Replace IdentityDbContext with IdentityDbContext when created
        private readonly IdentityDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        // TODO: IStorageService belongs to a shared infrastructure or separate module
        private readonly IStorageService _storageService;
        private readonly ILogger<ProfileService> _logger;

        public ProfileService(
            IdentityDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            IStorageService storageService,
            ILogger<ProfileService> logger)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _storageService = storageService;
            _logger = logger;
        }

        /// <summary>
        /// Returns the current user's profile in API response shape (snake_case)
        /// so the mobile app receives avatar_url, display_name, etc.
        /// </summary>
        public async Task<object?> GetMyProfileForApiAsync(Guid userId)
        {
            return await GetBasicProfileAsync(userId);
        }

        public async Task<UserProfile?> GetMyProfileAsync(Guid userId)
        {
            return await _dbContext.UserProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == userId);
        }

        /// <summary>
        /// Gets a profile summary with IDOR protection.
        /// SECURITY: Only allows access if user is viewing their own profile
        /// or if they are in an active partnership with the target user.
        /// </summary>
        public async Task<object?> GetProfileSummaryAsync(Guid requesterId, Guid profileId)
        {
            if (requesterId == profileId)
            {
                return await GetBasicProfileAsync(profileId);
            }

            // TODO: Phase 3 -- inject IPartnershipResolver from Partnership.Contracts to check partnership
            // For now, deny cross-user profile access until Partnership module is wired up
            _logger.LogWarning(
                "Cross-user profile access denied pending Partnership module: User {RequesterId} -> Profile {ProfileId}",
                requesterId, profileId);
            return null;
        }

        private async Task<object?> GetBasicProfileAsync(Guid profileId)
        {
            var profile = await _dbContext.UserProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == profileId);

            if (profile == null)
            {
                return null;
            }

            return new
            {
                id = profile.Id,
                email = profile.Email,
                display_name = profile.DisplayName,
                avatar_url = profile.AvatarUrl,
                created_at = profile.CreatedAt
            };
        }

        public async Task<UserProfile?> UpdateMyProfileAsync(Guid userId, UpdateProfileRequest request)
        {
            return await UpdateProfileInternalAsync(userId, userId, request);
        }

        public async Task<UserProfile?> UpdateProfileAsync(Guid id, Guid userId, UpdateProfileRequest request)
        {
            return await UpdateProfileInternalAsync(id, userId, request);
        }

        public async Task<string?> UploadAvatarAsync(Guid userId, IFormFile file)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return null;
            }

            var extension = Path.GetExtension(file.FileName);
            var fileName = $"avatar_{userId}_{DateTime.UtcNow.Ticks}{extension}";

            var avatarUrl = await _storageService.UploadFileAsync(file, fileName, "media");

            var profile = await _dbContext.UserProfiles.FirstOrDefaultAsync(p => p.Id == userId);
            if (profile != null)
            {
                profile.AvatarUrl = avatarUrl;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            user.AvatarUrl = avatarUrl;
            user.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return avatarUrl;
        }

        private async Task<UserProfile?> UpdateProfileInternalAsync(Guid id, Guid userId, UpdateProfileRequest request)
        {
            try
            {
                var applicationUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == id.ToString());
                if (applicationUser == null)
                {
                    return null;
                }

                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (profile == null)
                {
                    return null;
                }

                var displayName = request.DisplayName ?? request.display_name;
                if (!string.IsNullOrWhiteSpace(displayName))
                {
                    applicationUser.DisplayName = displayName;
                    applicationUser.UpdatedAt = DateTime.UtcNow;

                    profile.DisplayName = displayName;
                }

                var avatarUrl = request.AvatarUrl ?? request.avatar_url;
                if (avatarUrl != null)
                {
                    applicationUser.AvatarUrl = avatarUrl;
                    profile.AvatarUrl = avatarUrl;
                }

                profile.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "Updated profile for user {UserId}: DisplayName={DisplayName}",
                    id, displayName);

                return profile;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", id);
                throw;
            }
        }
    }
}
