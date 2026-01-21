using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing user profiles
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class ProfileController : BaseApiController
    {
        private readonly IProfileService _profileService;
        private readonly ILogger<ProfileController> _logger;

        public ProfileController(
            IProfileService profileService,
            ILogger<ProfileController> logger)
        {
            _profileService = profileService;
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
                var profile = await _profileService.GetMyProfileAsync(userId);

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
                var summary = await _profileService.GetProfileSummaryAsync(userId, id);

                if (summary == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                return Ok(summary);
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
                var updated = await _profileService.UpdateMyProfileAsync(userId, request);

                if (updated == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                return Ok(updated);
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
                var updated = await _profileService.UpdateProfileAsync(id, userId, request);

                if (updated == null)
                {
                    return NotFound(new { message = "Profile not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile {Id}", id);
                return StatusCode(500, new { message = "Error updating profile", error = ex.Message });
            }
        }
        /// <summary>
        /// Uploads a user avatar image
        /// </summary>
        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            // Validate file type
            if (!file.ContentType.StartsWith("image/"))
            {
                return BadRequest(new { message = "File must be an image" });
            }

            // Validate file size (e.g. max 5MB)
            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "File size usually exceeds 5MB limit" });
            }

            try
            {
                var avatarUrl = await _profileService.UploadAvatarAsync(userId, file);

                if (avatarUrl == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(new { avatar_url = avatarUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading avatar for user {UserId}", userId);
                return StatusCode(500, new { message = "Error uploading avatar", error = ex.Message });
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

