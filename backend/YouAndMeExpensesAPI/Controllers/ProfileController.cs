using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing user profiles
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class ProfileController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<ProfileController> _logger;

        public ProfileController(
            AppDbContext dbContext, 
            UserManager<ApplicationUser> userManager,
            ILogger<ProfileController> logger)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _logger = logger;
        }

        /// <summary>
        /// Gets the authenticated user's profile
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyProfile()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == userId);

                if (profile == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting profile for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving profile", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets a specific user's profile by ID
        /// Used for looking up partner profiles
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetProfile(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (profile == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                // Return basic profile info (email, display name, avatar)
                // Don't expose sensitive data
                return Ok(new
                {
                    id = profile.Id,
                    email = profile.Email,
                    display_name = profile.DisplayName,
                    avatar_url = profile.AvatarUrl,
                    created_at = profile.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting profile {Id}", id);
                return StatusCode(500, new { message = "Error retrieving profile", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates the authenticated user's profile
        /// Updates both AspNetUsers (ApplicationUser) and user_profiles tables
        /// </summary>
        [HttpPut]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get ApplicationUser from Identity (AspNetUsers table) using DbContext
                // This ensures proper tracking for updates
                var applicationUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == userId.ToString());
                if (applicationUser == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Get UserProfile (user_profiles table)
                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == userId);

                if (profile == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                // Update display name in both tables if provided
                var displayName = request.DisplayName ?? request.display_name;
                if (!string.IsNullOrWhiteSpace(displayName))
                {
                    // Update in AspNetUsers (ApplicationUser) using DbContext
                    applicationUser.DisplayName = displayName;
                    applicationUser.UpdatedAt = DateTime.UtcNow;

                    // Update in user_profiles table
                    profile.DisplayName = displayName;
                }

                // Update avatar URL if provided
                var avatarUrl = request.AvatarUrl ?? request.avatar_url;
                if (avatarUrl != null)
                {
                    applicationUser.AvatarUrl = avatarUrl;
                    profile.AvatarUrl = avatarUrl;
                }

                profile.UpdatedAt = DateTime.UtcNow;

                // Save changes to both tables in a single transaction
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Updated profile for user {UserId}: DisplayName={DisplayName}", 
                    userId, displayName);

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
                return StatusCode(500, new { message = "Error updating profile", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates a specific user's profile by ID (legacy support)
        /// Validates that the user can only update their own profile
        /// Updates both AspNetUsers (ApplicationUser) and user_profiles tables
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            // Users can only update their own profile
            if (id != userId)
            {
                return Forbid();
            }

            try
            {
                // Get ApplicationUser from Identity (AspNetUsers table) using DbContext
                // This ensures proper tracking for updates
                var applicationUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == id.ToString());
                if (applicationUser == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Get UserProfile (user_profiles table)
                var profile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (profile == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                // Update display name in both tables if provided
                var displayName = request.DisplayName ?? request.display_name;
                if (!string.IsNullOrWhiteSpace(displayName))
                {
                    // Update in AspNetUsers (ApplicationUser) using DbContext
                    applicationUser.DisplayName = displayName;
                    applicationUser.UpdatedAt = DateTime.UtcNow;

                    // Update in user_profiles table
                    profile.DisplayName = displayName;
                }

                // Update avatar URL if provided
                var avatarUrl = request.AvatarUrl ?? request.avatar_url;
                if (avatarUrl != null)
                {
                    applicationUser.AvatarUrl = avatarUrl;
                    profile.AvatarUrl = avatarUrl;
                }

                profile.UpdatedAt = DateTime.UtcNow;

                // Save changes to both tables in a single transaction
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Updated profile for user {UserId}: DisplayName={DisplayName}", 
                    id, displayName);

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile {Id}", id);
                return StatusCode(500, new { message = "Error updating profile", error = ex.Message });
            }
        }
    }

    /// <summary>
    /// Request model for updating user profile
    /// Accepts both PascalCase and snake_case property names for compatibility
    /// </summary>
    public class UpdateProfileRequest
    {
        /// <summary>
        /// Display name (PascalCase)
        /// </summary>
        public string? DisplayName { get; set; }

        /// <summary>
        /// Display name (snake_case - for frontend compatibility)
        /// </summary>
        public string? display_name { get; set; }

        /// <summary>
        /// Avatar URL (PascalCase)
        /// </summary>
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// Avatar URL (snake_case - for frontend compatibility)
        /// </summary>
        public string? avatar_url { get; set; }

        /// <summary>
        /// Email (optional, usually not updated via this endpoint)
        /// </summary>
        public string? Email { get; set; }
    }
}

