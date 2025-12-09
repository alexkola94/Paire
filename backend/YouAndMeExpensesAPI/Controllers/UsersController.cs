using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for user-related operations
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class UsersController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<UsersController> _logger;

        public UsersController(AppDbContext dbContext, ILogger<UsersController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Find a user by email address
        /// Returns basic public profile information
        /// </summary>
        [HttpGet("find-by-email")]
        public async Task<IActionResult> FindUserByEmail([FromQuery] string email)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            try
            {
                var emailLower = email.ToLower();
                var user = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == emailLower);

                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Return only public profile info
                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    display_name = user.DisplayName,
                    avatar_url = user.AvatarUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding user by email {Email}", email);
                return StatusCode(500, new { message = "Error finding user", error = ex.Message });
            }
        }
    }
}

