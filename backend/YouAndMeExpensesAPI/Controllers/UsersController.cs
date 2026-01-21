using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for user-related operations
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class UsersController : BaseApiController
    {
        private readonly IUsersService _usersService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IUsersService usersService, ILogger<UsersController> logger)
        {
            _usersService = usersService;
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
                var result = await _usersService.FindUserByEmailAsync(email);

                if (result == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding user by email {Email}", email);
                return StatusCode(500, new { message = "Error finding user", error = ex.Message });
            }
        }
    }
}

