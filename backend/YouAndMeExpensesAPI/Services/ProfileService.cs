using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Controllers;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Concrete implementation of <see cref="IProfileService"/> that handles
    /// all profile reads/updates and avatar uploads.
    /// </summary>
    public class ProfileService : IProfileService
    {
        private readonly AppDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IStorageService _storageService;
        private readonly ILogger<ProfileService> _logger;

        public ProfileService(
            AppDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            IStorageService storageService,
            ILogger<ProfileService> logger)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _storageService = storageService;
            _logger = logger;
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
            // SECURITY FIX: Allow users to view their own profile
            if (requesterId == profileId)
            {
                return await GetBasicProfileAsync(profileId);
            }

            // SECURITY FIX: Check if users are partners before allowing access
            var isPartner = await _dbContext.Partnerships
                .AnyAsync(p => 
                    p.Status == PartnershipStatus.Active &&
                    ((p.User1Id == requesterId && p.User2Id == profileId) ||
                     (p.User1Id == profileId && p.User2Id == requesterId)));

            if (!isPartner)
            {
                // Return null (404) - don't reveal if profile exists to unauthorized users
                _logger.LogWarning(
                    "IDOR attempt blocked: User {RequesterId} tried to access profile {ProfileId} without authorization",
                    requesterId, profileId);
                return null;
            }

            return await GetBasicProfileAsync(profileId);
        }

        /// <summary>
        /// Helper method to retrieve basic profile information.
        /// Should only be called after authorization checks pass.
        /// </summary>
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
            // Caller ensures authorization (id must equal userId), so just perform the update.
            return await UpdateProfileInternalAsync(id, userId, request);
        }

        public async Task<string?> UploadAvatarAsync(Guid userId, IFormFile file)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return null;
            }

            // Generate unique filename: avatar_userId_timestamp.ext
            var extension = Path.GetExtension(file.FileName);
            var fileName = $"avatar_{userId}_{DateTime.UtcNow.Ticks}{extension}";

            // Upload to "media" bucket
            var avatarUrl = await _storageService.UploadFileAsync(file, fileName, "media");

            // Update user profile
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

        /// <summary>
        /// Shared implementation for profile update logic, matching the previous controller behavior.
        /// </summary>
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

